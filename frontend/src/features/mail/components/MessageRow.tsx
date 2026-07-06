import React from 'react';
import { useMailStore } from '@/stores/mail';
import type { MessageSummary } from '@/api/mail';

interface MessageRowProps {
  message: MessageSummary;
  selected: boolean;
  checked?: boolean;
  onToggleCheck?: () => void;
  onSelect: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const thisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    if (thisYear) {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getSenderDisplay(from_: MessageSummary['from_']): string {
  if (Array.isArray(from_)) {
    return from_.map((a) => a.name || a.email).join(', ') || '未知';
  }
  return from_.name || from_.email || '未知';
}

/** 关键词高亮 (大小写不敏感, 转义正则特殊字符) */
function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword || !text) return text;
  try {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length === 1) return text;
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded-none px-0">{part}</mark>
        : part
    );
  } catch {
    return text;
  }
}

/** 从发件人提取首字母头像 */
function getAvatarLetter(from_: MessageSummary['from_']): string {
  const display = getSenderDisplay(from_);
  return display.charAt(0).toUpperCase();
}

export default function MessageRow({ message, selected, checked, onToggleCheck, onSelect }: MessageRowProps) {
  const flags = message.flags || [];
  const isFlagged = flags.includes('\\Flagged');
  const searchQuery = useMailStore((s) => s.searchQuery);
  const kw = searchQuery.trim();

  return (
    <div
      onClick={onSelect}
      className={`flex items-center px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-all duration-150 ${
        selected
          ? 'bg-[#c7dbff] border-l-2 border-l-[#066da5] shadow-sm'
          : message.is_read
          ? 'bg-white hover:bg-[#edf3ff] hover:border-l-2 hover:border-l-transparent'
          : 'bg-white font-semibold hover:bg-[#edf3ff] hover:border-l-2 hover:border-l-transparent'
      }`}
    >
      {/* Checkbox */}
      <div className="w-9 flex-shrink-0 flex items-center" onClick={(e) => { e.stopPropagation(); onToggleCheck?.(); }}>
        <input
          type="checkbox"
          checked={checked || false}
          onChange={() => onToggleCheck?.()}
          className="accent-[#066da5]"
        />
      </div>

      {/* Avatar / Flag icon */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {isFlagged ? (
          <span className="text-yellow-500 text-sm">⭐</span>
        ) : !message.is_read ? (
          <div className="w-7 h-7 rounded-full bg-[#066da5] flex items-center justify-center text-white text-[11px] font-bold">
            {getAvatarLetter(message.from_)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[11px] font-medium">
            {getAvatarLetter(message.from_)}
          </div>
        )}
      </div>

      {/* Sender with highlight */}
      <div className="flex-1 min-w-0 px-2 truncate text-sm">
        <span className={message.is_read ? 'text-gray-600' : 'text-gray-900'}>
          {highlightText(getSenderDisplay(message.from_), kw)}
        </span>
      </div>

      {/* Subject with highlight */}
      <div className="hidden sm:block flex-1 min-w-0 px-2 truncate text-sm text-gray-500">
        {message.subject
          ? highlightText(message.subject, kw)
          : <span className="text-gray-300">(无主题)</span>}
      </div>

      {/* Attachment icon inline */}
      {message.has_attachments && (
        <span className="text-gray-400 text-xs mr-1 flex-shrink-0">📎</span>
      )}

      {/* Date */}
      <div className="hidden sm:block w-24 flex-shrink-0 px-2 text-right text-xs text-gray-400 tabular-nums">
        {formatDate(message.date)}
      </div>

      {/* Size */}
      <div className="w-16 flex-shrink-0 text-right text-xs text-gray-400 tabular-nums">
        {formatSize(message.size)}
      </div>
    </div>
  );
}
