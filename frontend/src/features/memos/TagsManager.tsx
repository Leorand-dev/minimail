/**
 * TagsManager — 标签管理面板
 *
 * 功能: 创建 / 重命名 / 删除标签, 查看关联笔记数
 */

import { useState } from 'react';
import type { NoteTag } from '@/api/memos';
import { createTag, renameTag, deleteTag } from '@/api/memos';

interface TagsManagerProps {
  tags: NoteTag[];
  onRefresh: () => void;
}

export default function TagsManager({ tags, onRefresh }: TagsManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await createTag(name);
      setNewTagName('');
      setError('');
      onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail || '创建失败');
    }
  };

  const handleRenameStart = (tag: NoteTag) => {
    setRenaming(tag.name);
    setRenameValue(tag.name);
  };

  const handleRenameConfirm = async () => {
    if (!renaming || !renameValue.trim()) return;
    try {
      await renameTag(renaming, renameValue.trim());
      setRenaming(null);
      setError('');
      onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail || '重命名失败');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定删除标签 "#${name}"？将从所有笔记中移除。`)) return;
    setDeleting(name);
    try {
      await deleteTag(name);
      setError('');
      onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.detail || '删除失败');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h3 className="text-base font-semibold text-gray-800 mb-4">🏷️ 标签管理</h3>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* 新建标签 */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="输入新标签名..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#066da5]"
        />
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="px-3 py-1.5 text-sm bg-[#066da5] text-white rounded-md hover:bg-[#05588a] disabled:opacity-50 transition-colors"
        >
          + 创建
        </button>
      </div>

      {/* 标签列表 */}
      <div className="space-y-1">
        {tags.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">暂无标签，创建笔记时会自动提取标签。</p>
        )}
        {tags.map((tag) => (
          <div
            key={tag.name}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 group"
          >
            {/* 标签名/重命名输入 */}
            {renaming === tag.name ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border border-[#066da5] rounded-md focus:outline-none"
                />
                <button
                  onClick={handleRenameConfirm}
                  className="px-2 py-1 text-xs bg-[#066da5] text-white rounded hover:bg-[#05588a]"
                >
                  确定
                </button>
                <button
                  onClick={() => setRenaming(null)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <span className="w-6 text-sm text-gray-400">#</span>
                <span className="flex-1 text-sm text-gray-700 font-medium">{tag.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {tag.note_count} 条笔记
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRenameStart(tag)}
                    className="p-1 text-xs text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100"
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(tag.name)}
                    disabled={deleting === tag.name}
                    className="p-1 text-xs text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 disabled:opacity-50"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
