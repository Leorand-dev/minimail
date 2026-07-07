/**
 * MemoCard — 单条笔记卡片
 *
 * Markdown 内容渲染 (react-markdown)
 * 时间 + 标签 + 操作按钮 (编辑/删除/置顶)
 */


import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Note } from '@/api/memos';
import { toggleReaction, fetchAttachments, fetchComments, createComment } from '@/api/memos';
import type { NoteAttachment } from '@/api/memos';

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

export default function MemoCard({ note: initialNote, onEdit, onDelete, onTogglePin }: MemoCardProps) {
  const [note, setNote] = useState(initialNote);

  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Note[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchAttachments(note.id).then(setAttachments).catch(() => {});
    fetchComments(note.id).then(setComments).catch(() => {});
  }, [note.id]);

  const handleReaction = async (emoji: string) => {
    try {
      const updated = await toggleReaction(note.id, emoji);
      setNote(updated);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150">

      {/* 头部: 时间 + 置顶图标 + 操作按钮 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {note.pinned && <span className="text-amber-500 drop-shadow-sm">📌</span>}
          <span>{note.created_at ? formatTime(note.created_at) : ''}</span>
          {note.visibility === 'public' && (
            <span className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">公开</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTogglePin(note.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-400 hover:text-amber-500 transition-colors"
            title={note.pinned ? '取消置顶' : '置顶'}
          >
            📌
          </button>
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-xs text-gray-400 hover:text-red-500 transition-colors"
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
        <div className="flex flex-wrap gap-1.5 mt-3">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-[#066da5]/5 text-[#066da5] text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 反应行 */}
      {note.reactions && note.reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {note.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-150 ${
                r.reacted
                  ? 'bg-[#066da5]/10 text-[#066da5] font-medium ring-1 ring-[#066da5]/20'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 快速反应按钮 (无反应时显示) */}
      {(note.reactions == null || note.reactions.length === 0) && (
        <div className="flex gap-1.5 mt-3">
          <span className="text-[10px] text-gray-300 leading-6">快速反应:</span>
          {['👍', '❤️', '🎉', '🔥', '💡'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-sm opacity-50 hover:opacity-100 transition-opacity"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 附件 */}
      {attachments.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 mb-2">📎 附件</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 hover:text-[#066da5] transition-colors border border-gray-200"
              >
                <span className="truncate max-w-[200px]">{att.filename}</span>
                <span className="text-gray-400">
                  ({(att.size / 1024).toFixed(1)} KB)
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 评论 */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          onClick={() => {
            setShowComments((prev) => !prev);
            if (!showComments && comments.length === 0) {
              fetchComments(note.id).then(setComments).catch(() => {});
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#066da5] transition-colors"
        >
          <span>💬</span>
          <span>{comments.length} 条评论</span>
          <span
            className={`ml-1 transition-transform ${
              showComments ? 'rotate-180' : ''
            }`}
          >
            ▾
          </span>
        </button>

        {showComments && (
          <div className="mt-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400">暂无评论</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <div className="prose prose-sm max-w-none prose-p:m-0">
                  <ReactMarkdown>{c.content}</ReactMarkdown>
                </div>
                {c.created_at && (
                  <div className="mt-1 text-[10px] text-gray-400">
                    {formatTime(c.created_at)}
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="写下你的评论..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#066da5] resize-none"
                rows={2}
              />
              <button
                onClick={async () => {
                  if (!commentInput.trim() || sending) return;
                  setSending(true);
                  try {
                    await createComment(note.id, commentInput.trim());
                    setCommentInput('');
                    const updated = await fetchComments(note.id);
                    setComments(updated);
                  } catch {
                    // silently fail
                  } finally {
                    setSending(false);
                  }
                }}
                disabled={!commentInput.trim() || sending}
                className="px-3 py-1.5 text-sm bg-[#066da5] text-white rounded-md hover:bg-[#05588a] disabled:opacity-50 transition-colors self-end"
              >
                {sending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 编辑/删除时间 */}
      {note.updated_at && note.created_at && note.updated_at !== note.created_at && (
        <div className="mt-2 text-[10px] text-gray-300">
          已编辑 {formatTime(note.updated_at)}
        </div>
      )}
    </div>
  );
}
