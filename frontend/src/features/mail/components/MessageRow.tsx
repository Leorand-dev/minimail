import React from 'react';
import type { MessageSummary } from '@/api/mail';

interface MessageRowProps {
  message: MessageSummary;
  selected: boolean;
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

export default function MessageRow({ message, selected, onSelect }: MessageRowProps) {
  const flags = message.flags || [];
  const isFlagged = flags.includes('\\Flagged');

  return (
    <div
      onClick={onSelect}
      className={`flex items-center px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors ${
        selected
          ? 'bg-[#c7dbff]'
          : message.is_read
          ? 'bg-white hover:bg-[#edf3ff]'
          : 'bg-white font-semibold hover:bg-[#edf3ff]'
      }`}
    >
      {/* Attachment / Flag icon */}
      <div className="w-8 flex-shrink-0 text-center text-xs">
        {isFlagged ? (
          <span className="text-yellow-500">⭐</span>
        ) : message.has_attachments ? (
          <span className="text-gray-400">📎</span>
        ) : !message.is_read ? (
          <span className="text-[#066da5] text-lg leading-none">•</span>
        ) : null}
      </div>

      {/* Sender */}
      <div className="flex-1 min-w-0 px-2 truncate text-sm">
        {!message.is_read ? (
          <span className="text-gray-900">{getSenderDisplay(message.from_)}</span>
        ) : (
          <span className="text-gray-600">{getSenderDisplay(message.from_)}</span>
        )}
      </div>

      {/* Subject (shown on small screens as second row) */}
      <div className="hidden sm:block flex-1 min-w-0 px-2 truncate text-sm text-gray-500">
        {message.subject || '(无主题)'}
      </div>

      {/* Date */}
      <div className="hidden sm:block w-24 flex-shrink-0 px-2 text-right text-xs text-gray-400">
        {formatDate(message.date)}
      </div>

      {/* Size */}
      <div className="w-16 flex-shrink-0 text-right text-xs text-gray-400">
        {formatSize(message.size)}
      </div>
    </div>
  );
}
