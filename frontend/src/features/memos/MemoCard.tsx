/**
 * MemoCard — 单条笔记卡片
 *
 * Markdown 内容渲染 (react-markdown)
 * 时间 + 标签 + 操作按钮 (编辑/删除/置顶)
 */


import ReactMarkdown from 'react-markdown';
import type { Note } from '@/api/memos';

interface MemoCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function MemoCard({ note, onEdit, onDelete, onTogglePin }: MemoCardProps) {
  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      {/* 头部: 时间 + 置顶图标 + 操作按钮 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {note.pinned && <span className="text-amber-500">📌</span>}
          <span>{formatTime(note.created_at)}</span>
          {note.visibility === 'public' && (
            <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 text-[10px]">公开</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTogglePin(note.id)}
            className="p-1 rounded hover:bg-gray-100 text-xs text-gray-400 hover:text-amber-500"
            title={note.pinned ? '取消置顶' : '置顶'}
          >
            📌
          </button>
          <button
            onClick={() => onEdit(note)}
            className="p-1 rounded hover:bg-gray-100 text-xs text-gray-400 hover:text-blue-500"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 rounded hover:bg-gray-100 text-xs text-gray-400 hover:text-red-500"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 内容: Markdown 渲染 */}
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#066da5] prose-code:text-pink-600 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>

      {/* 底部: 标签 */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 编辑/删除时间 */}
      {note.updated_at !== note.created_at && (
        <div className="mt-2 text-[10px] text-gray-300">
          已编辑 {formatTime(note.updated_at)}
        </div>
      )}
    </div>
  );
}
