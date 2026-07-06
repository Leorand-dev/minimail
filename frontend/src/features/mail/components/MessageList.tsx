import React from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchMessages, fetchMessageDetail, searchMessages as searchApi } from '@/api/mail';
import type { MessageSummary } from '@/api/mail';
import MessageRow from './MessageRow';

interface MessageListProps {
  className?: string;
  onSelectMessage?: () => void;
}

export default function MessageList({ className = '', onSelectMessage }: MessageListProps) {
  const messages = useMailStore((s) => s.messages);
  const loading = useMailStore((s) => s.loading);
  const error = useMailStore((s) => s.error);
  const selectedUid = useMailStore((s) => s.selectedUid);
  const setSelectedUid = useMailStore((s) => s.setSelectedUid);
  const setPreviewMessage = useMailStore((s) => s.setPreviewMessage);
  const setError = useMailStore((s) => s.setError);
  const setMessages = useMailStore((s) => s.setMessages);
  const setLoading = useMailStore((s) => s.setLoading);
  const searchQuery = useMailStore((s) => s.searchQuery);
  const page = useMailStore((s) => s.page);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const totalPages = useMailStore((s) => s.totalPages);
  const totalMessages = useMailStore((s) => s.totalMessages);
  const setPage = useMailStore((s) => s.setPage);

  const handleSelect = async (msg: MessageSummary) => {
    setSelectedUid(msg.uid);
    setPreviewMessage(null);
    onSelectMessage?.();
    try {
      const detail = await fetchMessageDetail(currentFolder, msg.uid);
      setPreviewMessage(detail);
    } catch (err) {
      console.warn('加载邮件详情失败:', err);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      if (searchQuery.trim()) {
        const res = await searchApi(searchQuery, currentFolder, page, 50);
        setMessages(res.messages, res.total, res.page, res.total_pages);
      } else {
        const res = await fetchMessages(currentFolder, page, 50);
        setMessages(res.messages, res.total, res.page, res.total_pages);
      }
    } catch {
      setError('加载邮件失败');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    const isConfigError = error === '请添加邮件账户';
    return (
      <div className={`${className} items-center justify-center text-gray-400`}>
        <div className="text-center max-w-xs">
          <div className="text-3xl mb-3">{isConfigError ? '📭' : '⚠️'}</div>
          <p className="mb-1 text-gray-500">{isConfigError ? '邮箱尚未配置' : '连接失败'}</p>
          <p className="mb-3 text-xs text-gray-400">
            {isConfigError
              ? '请先添加邮箱账户'
              : '请检查网络或者邮件账户设置'}
          </p>
          <div className="flex gap-2 justify-center">
            {isConfigError && (
              <button
                onClick={() => useMailStore.getState().setActiveView('settings')}
                className="px-4 py-1.5 bg-[#066da5] text-white text-xs rounded hover:bg-[#05588a]"
              >
                ⚙️ 去设置
              </button>
            )}
            <button onClick={handleRefresh} className="px-4 py-1.5 text-[#066da5] text-xs border border-[#066da5] rounded hover:bg-blue-50">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} min-w-0`}>
      {/* Column headers (Roundcube 风格) */}
      <div className="flex items-center px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">
        <div className="w-8 flex-shrink-0"></div>
        <div className="flex-1 min-w-0 px-2">发件人</div>
        <div className="hidden sm:block w-24 flex-shrink-0 px-2">日期</div>
        <div className="w-16 flex-shrink-0 text-center">大小</div>
      </div>

      {/* Message rows */}
      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mr-2" />
            加载中...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            暂无邮件
          </div>
        ) : (
          messages.map((msg) => (
            <MessageRow
              key={`${msg.uid}-${currentFolder}`}
              message={msg}
              selected={msg.uid === selectedUid}
              onSelect={() => handleSelect(msg)}
            />
          ))
        )}
      </div>

      {/* Pagination (Roundcube 风格底部页码) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <span>{totalMessages} 封邮件</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 上一页
            </button>
            <span className="font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              下一页 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
