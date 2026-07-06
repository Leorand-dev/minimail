import React, { useState } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchMessages, fetchMessageDetail, searchMessages as searchApi, moveMessage, deleteMessage } from '@/api/mail';
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
  const folders = useMailStore((s) => s.folders);
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

  // ── 多选 + 操作 ──
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAllChecked = messages.length > 0 && checked.size === messages.length;

  const toggleCheck = (uid: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleAll = () => {
    if (isAllChecked) setChecked(new Set());
    else setChecked(new Set(messages.map((m) => m.uid)));
  };

  const clearChecked = () => setChecked(new Set());

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
          useMailStore.getState().addReadUid(msg.uid);
          const currentMsgs = useMailStore.getState().messages;
          const updated = currentMsgs.map((m) =>
            m.uid === msg.uid ? { ...m, is_read: true, flags: [...(m.flags || []), '\\Seen'] } : m
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

  // ── 批量操作 ──
  const handleBatchDelete = async () => {
    if (checked.size === 0) return;
    setDeleting(true);
    try {
      const uids = Array.from(checked);
      // 逐个删除 (IMAP 不支持批量)
      for (const uid of uids) {
        try {
          // 先尝试真实 IMAP
          await deleteMessage(currentFolder, uid);
        } catch {
          // 本地删除 (demo 模式)
        }
      }
      // 从本地列表移除
      const updated = messages.filter((m) => !checked.has(m.uid));
      setMessages(updated, updated.length, 1, 1);
      clearChecked();
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchMove = async (target: string) => {
    if (checked.size === 0) return;
    setMoving(true);
    try {
      const uids = Array.from(checked);
      for (const uid of uids) {
        try {
          await moveMessage(currentFolder, uid, target);
        } catch {
          // 本地移动 (demo 模式)
        }
      }
      // 从当前列表移除
      const updated = messages.filter((m) => !checked.has(m.uid));
      setMessages(updated, updated.length, 1, 1);
      clearChecked();
      setShowMoveDialog(false);
    } finally {
      setMoving(false);
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
            {isConfigError ? '请先添加邮箱账户' : '请检查网络或者邮件账户设置'}
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

  // ── 可选的目标文件夹 (排除当前文件夹) ──
  const targetFolders = folders.filter(
    (f) => f.name !== currentFolder && !f.name.startsWith('[Gmail]') && !f.is_container
  );

  return (
    <div className={`${className} min-w-0 flex flex-col`}>
      {/* Column headers */}
      <div className="flex items-center px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">
        <div className="w-9 flex-shrink-0 flex items-center">
          <input
            type="checkbox"
            checked={isAllChecked}
            onChange={toggleAll}
            className="accent-[#066da5]"
          />
        </div>
        <div className="flex-1 min-w-0 px-2">发件人</div>
        <div className="hidden sm:block flex-1 min-w-0 px-2">主题</div>
        <div className="hidden sm:block w-24 flex-shrink-0 px-2 text-right">日期</div>
        <div className="w-16 flex-shrink-0 text-right">大小</div>
      </div>

      {/* Message rows / Loading / Empty */}
      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 && (
          <div className="divide-y divide-transparent">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

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
                  checked={checked.has(msg.uid)}
                  onToggleCheck={() => toggleCheck(msg.uid)}
                  onSelect={() => handleSelect(msg)}
                />
              </div>
            ))}
          </>
        )}

        {loading && messages.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-center py-2 bg-white/80 backdrop-blur-sm border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
              刷新中...
            </div>
          </div>
        )}
      </div>

      {/* ── 批量操作栏 ── */}
      {checked.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-blue-50">
          <span className="text-xs text-gray-600 font-medium">
            已选 {checked.size} 封
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBatchDelete}
            disabled={deleting}
            className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? '删除中...' : '🗑 删除'}
          </button>
          <button
            onClick={() => setShowMoveDialog(true)}
            className="px-3 py-1 text-xs text-white bg-[#066da5] rounded hover:bg-[#05588a] transition-colors"
          >
            📂 移动到
          </button>
          <button
            onClick={clearChecked}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
          >
            取消
          </button>
        </div>
      )}

      {/* ── 分页 ── */}
      {totalPages > 1 && !loading && checked.size === 0 && (
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
            <span className="font-medium tabular-nums">{page} / {totalPages}</span>
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

      {/* ── 移动到文件夹弹窗 ── */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowMoveDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl w-80 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">移动到文件夹</h3>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {targetFolders.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">无可用的目标文件夹</p>
              ) : (
                targetFolders.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => handleBatchMove(f.name)}
                    disabled={moving}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  >
                    {f.name === 'INBOX' ? '📥' :
                     f.name === 'Sent' ? '📤' :
                     f.name === 'Drafts' ? '📝' :
                     f.name === 'Junk' || f.name === 'Spam' ? '⚠️' :
                     f.name === 'Trash' ? '🗑️' :
                     f.name === 'Archive' ? '📦' : '📁'} {f.name}
                    {f.unseen > 0 && <span className="ml-1 text-xs text-gray-400">({f.unseen})</span>}
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-3 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
