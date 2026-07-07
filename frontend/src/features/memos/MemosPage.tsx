/**
 * MemosPage — 笔记库主面板
 *
 * 布局:
 *   ┌─────────────────────────────────────┐
 *   │  📝 笔记库 · N 条笔记    [🔍] [✏️] │  ← Toolbar
 *   ├──────────────┬──────────────────────┤
 *   │  标签列表     │  时间线 / 编辑器     │  ← Filter + Content
 *   │  #all        │  ┌──────────────┐   │
 *   │  #phase1     │  │ MemoCard     │   │
 *   │  #notes      │  ├──────────────┤   │
 *   │              │  │ MemoCard     │   │
 *   │              │  └──────────────┘   │
 *   └──────────────┴──────────────────────┘
 */

import { useEffect, useState, useCallback } from 'react';
import {
  fetchNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
  togglePin as apiTogglePin,
  fetchTags,
  searchNotes as apiSearchNotes,
  fetchNoteSettings,
  updateNoteSettings,
  fetchWebhooks,
  createWebhook,
  deleteWebhook,
  fetchShortcuts,
  createShortcut,
  deleteShortcut,
} from '@/api/memos';
import type { Note, NoteSettings, NoteWebhook, NoteShortcut } from '@/api/memos';
import { useNotesStore } from '@/stores/memos';
import MemoList from './MemoList';
import MemoEditor from './MemoEditor';
import TagsManager from './TagsManager';

export default function MemosPage() {
  const {
    notes, tags, activeTag, searchQuery, editingNote,
    noteView, setNotes, setTags, setActiveTag, setSearchQuery,
    setLoading, setEditingNote, setNoteView,
    updateNoteInList, removeNoteFromList,
  } = useNotesStore();

  const [showEditor, setShowEditor] = useState(false);
  const [noteSettings, setNoteSettings] = useState<NoteSettings>({ note_allow_shares: true });
  const [webhooks, setWebhooks] = useState<NoteWebhook[]>([]);
  const [shortcuts, setShortcuts] = useState<NoteShortcut[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutTag, setShortcutTag] = useState('');

  // ── 加载笔记列表 ──
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page_size: 50 };
      if (activeTag) params.tag = activeTag;
      if (searchQuery) {
        const res = await apiSearchNotes({ q: searchQuery, page_size: 50 });
        setNotes(res.notes);
      } else {
        const res = await fetchNotes(params);
        setNotes(res.notes);
      }
    } catch (e) {
      console.error('加载笔记失败', e);
    } finally {
      setLoading(false);
    }
  }, [activeTag, searchQuery, setNotes, setLoading]);

  // ── 加载标签 ──
  const loadTags = useCallback(async () => {
    try {
      const res = await fetchTags();
      setTags(res);
    } catch {}
  }, [setTags]);

  useEffect(() => {
    loadNotes();
    loadTags();
  }, [loadNotes, loadTags]);

  // ── 加载笔记设置 ──
  const loadNoteSettings = useCallback(async () => {
    try {
      const res = await fetchNoteSettings();
      setNoteSettings(res);
    } catch {}
  }, []);

  // ── 加载 Webhook ──
  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetchWebhooks();
      setWebhooks(res);
    } catch {}
  }, []);

  // ── 加载快捷键 ──
  const loadShortcuts = useCallback(async () => {
    try {
      const res = await fetchShortcuts();
      setShortcuts(res);
    } catch {}
  }, []);

  // Load settings data when settings view is shown
  useEffect(() => {
    if (noteView === 'settings') {
      loadNoteSettings();
      loadWebhooks();
      loadShortcuts();
    }
  }, [noteView, loadNoteSettings, loadWebhooks, loadShortcuts]);

  const toggleAllowShares = async () => {
    try {
      const updated = await updateNoteSettings({ note_allow_shares: !noteSettings.note_allow_shares });
      setNoteSettings(updated);
    } catch {}
  };

  const handleAddWebhook = async () => {
    if (!webhookUrl.trim()) return;
    try {
      await createWebhook({ url: webhookUrl.trim() });
      setWebhookUrl('');
      await loadWebhooks();
    } catch {}
  };

  const handleAddShortcut = async () => {
    if (!shortcutName.trim()) return;
    try {
      await createShortcut({ name: shortcutName.trim(), filter_tag: shortcutTag });
      setShortcutName('');
      setShortcutTag('');
      await loadShortcuts();
    } catch {}
  };

  // ── 操作 ──
  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleSave = async (content: string, tags: string[]) => {
    if (editingNote) {
      const updated = await apiUpdateNote(editingNote.id, { content, tags });
      updateNoteInList(updated);
    } else {
      const created = await apiCreateNote({ content, tags });
      setNotes([created, ...notes]);
    }
    setShowEditor(false);
    setEditingNote(null);
    loadTags();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingNote(null);
  };

  const handleDelete = async (id: string) => {
    await apiDeleteNote(id);
    removeNoteFromList(id);
    loadTags();
  };

  const handleTogglePin = async (id: string) => {
    const updated = await apiTogglePin(id);
    updateNoteInList(updated);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="h-[55px] flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800">📝 笔记库</h2>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setNoteView('list')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                noteView === 'list'
                  ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              所有笔记
            </button>
            <button
              onClick={() => setNoteView('tags')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                noteView === 'tags'
                  ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              标签管理
            </button>
            <button
              onClick={() => setNoteView('settings')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                noteView === 'settings'
                  ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              设置
            </button>
          </div>
          <span className="text-xs text-gray-400">{noteView === 'list' && `${notes.length} 条笔记`}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 搜索: 仅列表视图显示 */}
          {noteView === 'list' && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记..."
                className="w-48 pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#066da5]"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          {noteView === 'list' && (
            <button
              onClick={() => {
                setEditingNote(null);
                setShowEditor(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#066da5] text-white rounded-md hover:bg-[#05588a] transition-colors"
            >
              ✏️ 新建
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: 标签过滤 (仅列表视图) */}
        {noteView === 'list' && (
          <div className="w-44 border-r border-gray-200 bg-gray-50 p-3 overflow-y-auto shrink-0">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">标签</div>
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveTag(null)}
              className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                activeTag === null
                  ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setActiveTag(tag.name)}
                className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                  activeTag === tag.name
                    ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span># {tag.name}</span>
                  <span className="text-xs text-gray-400">{tag.note_count}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* 右侧: 列表 / 标签管理 / 编辑器 */}
        <div className="flex-1 overflow-y-auto">
          {noteView === 'tags' ? (
            <TagsManager tags={tags} onRefresh={() => { loadNotes(); loadTags(); }} />
          ) : noteView === 'settings' ? (
            <div className="p-6 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">⚙️ 笔记库设置</h3>

              {/* 分享开关 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <h4 className="font-medium text-sm mb-3">公开分享</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-700">允许创建公开分享链接</div>
                    <div className="text-xs text-gray-400 mt-0.5">开启后可通过链接分享笔记给未登录用户</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={noteSettings.note_allow_shares} onChange={toggleAllowShares} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#066da5]"></div>
                  </label>
                </div>
              </div>

              {/* Webhook 配置 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <h4 className="font-medium text-sm mb-3">🔗 Webhook</h4>
                <div className="text-xs text-gray-400 mb-3">笔记创建/更新时发送 HTTP 通知</div>
                <div className="space-y-2">
                  {webhooks.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm truncate flex-1">{w.url}</span>
                      <button onClick={() => deleteWebhook(w.id).then(loadWebhooks)} className="text-xs text-red-500 hover:text-red-700 ml-2">删除</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded" />
                  <button onClick={handleAddWebhook} className="px-3 py-1 text-sm bg-[#066da5] text-white rounded hover:bg-[#05588a]">添加</button>
                </div>
              </div>

              {/* 快捷键 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-sm mb-3">🔖 快捷键</h4>
                <div className="text-xs text-gray-400 mb-3">保存的过滤条件快捷入口</div>
                <div className="space-y-2">
                  {shortcuts.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{s.icon} {s.name}</span>
                      <button onClick={() => deleteShortcut(s.id).then(loadShortcuts)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input type="text" value={shortcutName} onChange={e => setShortcutName(e.target.value)} placeholder="名称" className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded" />
                  <button onClick={handleAddShortcut} className="px-3 py-1 text-sm bg-[#066da5] text-white rounded hover:bg-[#05588a]">添加</button>
                </div>
              </div>
            </div>
          ) : showEditor ? (
            <div className="p-4 max-w-3xl">
              <MemoEditor
                note={editingNote}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <MemoList
              notes={notes}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
