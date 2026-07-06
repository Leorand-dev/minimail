import React from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchMessages, fetchMessageDetail, searchMessages as searchApi } from '@/api/mail';
import type { MessageSummary } from '@/api/mail';
import MessageRow from './MessageRow';
import api from '@/api/client';

interface MessageListProps {
  className?: string;
  onSelectMessage?: () => void;
}

/** 骨架屏行 — 脉冲动画占位 */
function SkeletonRow() {
  return (
    <div className="flex items-center px-3 py-2.5 border-b border-gray-100 animate-pulse">
      <div className="w-8 flex-shrink-0" />
      <div className="flex-1 px-2">
        <div className="h-3 bg-gray-200 rounded w-3/5" />
      </div>
      <div className="hidden sm:block flex-1 px-2">
        <div className="h-3 bg-gray-200 rounded w-4/5" />
      </div>
      <div className="hidden sm:block w-24 px-2">
        <div className="h-3 bg-gray-200 rounded w-14 ml-auto" />
      </div>
      <div className="w-16 text-right">
        <div className="h-3 bg-gray-200 rounded w-10 ml-auto" />
      </div>
    </div>
  );
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
    // 先尝试快速 demo 详情 (本地, 毫秒级)
    let detailLoaded = false;
    try {
      const res = await api.get('/mail/demo');
      const details = res.data.details || {};
      const detail = details[msg.uid];
      if (detail) {
        setPreviewMessage(detail);
        detailLoaded = true;
        // 标记本地消息为已读
        if (!msg.is_read) {
          const currentMsgs = useMailStore.getState().messages;
          const updated = currentMsgs.map((m) =>
            m.uid === msg.uid ? { ...m, is_read: true, flags: [...(m.flags || []), '\Seen'] } : m
          );
          useMailStore.getState().setMessages(updated, useMailStore.getState().totalMessages, useMailStore.getState().page, useMailStore.getState().totalPages);
        }
      }
    } catch {}

    if (detailLoaded) return;

    // demo 没有详情(或失败), 尝试 IMAP
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

  // ── Error state ──
  if (error) {
    const isConfigError = error === '请添加邮件账户';
    return (
      <div className={`${className} flex items-center justify-center text-gray-400 bg-gray-50`}>
        <div className="text-center max-w-xs animate-in fade-in duration-300">
          <div className="text-4xl mb-3">{isConfigError ? '📭' : '⚠️'}</div>
          <p className="mb-1 text-gray-500 font-medium">{isConfigError ? '邮箱尚未配置' : '连接失败'}</p>
          <p className="mb-4 text-xs text-gray-400">
            {isConfigError
              ? '请先添加邮箱账户'
              : '请检查网络或者邮件账户设置'}
          </p>
          <div className="flex gap-2 justify-center">
            {isConfigError && (
              <button
                onClick={() => useMailStore.getState().setActiveView('settings')}
                className="px-4 py-1.5 bg-[#066da5] text-white text-xs rounded hover:bg-[#05588a] transition-colors"
              >
                ⚙️ 去设置
              </button>
            )}
            <button onClick={handleRefresh} className="px-4 py-1.5 text-[#066da5] text-xs border border-[#066da5] rounded hover:bg-blue-50 transition-colors">
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} min-w-0 flex flex-col`}>
      {/* Column headers (Roundcube 风格) */}
      <div className="flex items-center px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">
        <div className="w-8 flex-shrink-0" />
        <div className="flex-1 min-w-0 px-2">发件人</div>
        <div className="hidden sm:block flex-1 min-w-0 px-2">主题</div>
        <div className="hidden sm:block w-24 flex-shrink-0 px-2 text-right">日期</div>
        <div className="w-16 flex-shrink-0 text-right">大小</div>
      </div>

      {/* Message rows / Loading / Empty */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Skeleton loading ── */}
        {loading && messages.length === 0 && (
          <div className="divide-y divide-transparent">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* ── Empty states ── */}
        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-in fade-in duration-300">
              {searchQuery.trim() ? (
                <>
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500 font-medium mb-1">未找到匹配的邮件</p>
                  <p className="text-xs text-gray-400">尝试修改搜索词或筛选条件</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📬</div>
                  <p className="text-gray-500 font-medium mb-1">暂无邮件</p>
                  <p className="text-xs text-gray-400">
                    {currentFolder === 'INBOX' ? '收件箱为空' : `文件夹 "${currentFolder}" 中没有邮件`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Message rows ── */}
        {!loading && messages.length > 0 && (
          <>
            {messages.map((msg, i) => (
              <div
                key={`${msg.uid}-${currentFolder}`}
                className="animate-in fade-in slide-in-from-top-1 duration-200"
                style={{ animationDelay: `${Math.min(i * 20, 300)}ms`, animationFillMode: 'backwards' } as React.CSSProperties}
              >
                <MessageRow
                  message={msg}
                  selected={msg.uid === selectedUid}
                  onSelect={() => handleSelect(msg)}
                />
              </div>
            ))}
          </>
        )}

        {/* ── Loading overlay (when paginating) ── */}
        {loading && messages.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-center py-2 bg-white/80 backdrop-blur-sm border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
              刷新中...
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <span className="font-medium">{totalMessages} 封邮件</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              ← 上一页
            </button>
            <span className="font-medium tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            >
              下一页 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
