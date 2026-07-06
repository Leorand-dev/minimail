import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailStore } from '@/stores/mail';
import { useAuthStore } from '@/stores/auth';
import type { Folder } from '@/api/mail';
import { fetchImapStatus, fetchAccountFolders, folderDisplayName } from '@/api/mail';
import type { ImapStatus, AccountFolderGroup } from '@/api/mail';
import api from '@/api/client';

interface FolderSidebarProps {
  className?: string;
  onSelectFolder?: () => void;
}

function FolderItem({
  folder,
  depth = 0,
  selected,
  onSelect,
}: {
  folder: Folder;
  depth?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon = folder.name === 'INBOX' ? '📥' :
    folder.name === 'Sent' ? '📤' :
    folder.name === 'Drafts' ? '📝' :
    folder.name === 'Junk' || folder.name === 'Spam' ? '⚠️' :
    folder.name === 'Trash' ? '🗑️' :
    folder.name === 'Archive' ? '📦' : '📁';

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm rounded ${
        selected
          ? 'bg-[#d0e2f3] text-[#066da5] font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate flex-1">{folderDisplayName(folder.name)}</span>
      {folder.unseen > 0 && (
        <span className="flex-shrink-0 bg-[#066da5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {folder.unseen > 99 ? '99+' : folder.unseen}
        </span>
      )}
    </div>
  );
}

export default function FolderSidebar({ className = '', onSelectFolder }: FolderSidebarProps) {
  const navigate = useNavigate();
  const folders = useMailStore((s) => s.folders);
  const accountFolders = useMailStore((s) => s.accountFolders);
  const setAccountFolders = useMailStore((s) => s.setAccountFolders);
  const currentAccount = useMailStore((s) => s.currentAccount);
  const setCurrentAccount = useMailStore((s) => s.setCurrentAccount);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const setCurrentFolder = useMailStore((s) => s.setCurrentFolder);
  const activeView = useMailStore((s) => s.activeView);
  const setActiveView = useMailStore((s) => s.setActiveView);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const unseenTotal = folders.reduce((sum, f) => sum + (f.unseen || 0), 0);
  const unifiedUnseen = accountFolders.reduce((sum, g) => sum + g.folders.reduce((s2, f) => s2 + (f.unseen || 0), 0), 0);

  const [imapStatus, setImapStatus] = useState<ImapStatus | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Load account-folders on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { fetchAccounts } = await import('@/api/accounts');
        const accounts = await fetchAccounts();
        if (accounts.length === 0) {
          // No accounts, try demo
          const demoRes = await api.get('/mail/demo');
          if (demoRes.data?.folders) {
            setAccountFolders([{
              account_id: 'demo',
              account_email: 'demo@example.com',
              account_name: '示例账户',
              folders: demoRes.data.folders,
            }]);
            setExpandedAccounts(new Set(['demo']));
          }
          return;
        }
        const groups: AccountFolderGroup[] = [];
        const expanded = new Set<string>();
        for (const acc of accounts) {
          if (!acc.imap_host) continue;
          try {
            const group = await fetchAccountFolders(acc.id);
            groups.push(group);
            expanded.add(group.account_id);
          } catch { /* skip */ }
        }
        if (groups.length > 0) {
          setAccountFolders(groups);
          setExpandedAccounts(expanded);
        }
      } catch {
        // Fallback to demo
        try {
          const demoRes = await api.get('/mail/demo');
          if (demoRes.data?.folders) {
            setAccountFolders([{
              account_id: 'demo',
              account_email: 'demo@example.com',
              account_name: '示例账户',
              folders: demoRes.data.folders,
            }]);
            setExpandedAccounts(new Set(['demo']));
          }
        } catch {}
      }
    };
    loadAccounts();

    fetchImapStatus().then(setImapStatus).catch(() => {});
  }, [setAccountFolders]);

  const handleSelectFolder = (accountId: string, folderName: string) => {
    setCurrentAccount(accountId);
    setCurrentFolder(folderName);
    setActiveView('mail');
    onSelectFolder?.();
  };

  const toggleAccount = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Build flat folder list for current selection (for compatibility)
  const flatFolders = accountFolders.flatMap((g) => g.folders);
  useEffect(() => {
    if (useMailStore.getState().folders.length === 0 && flatFolders.length > 0) {
      useMailStore.getState().setFolders(flatFolders);
    }
  }, [flatFolders]);

  const isUnifiedSelected = currentAccount === null && currentFolder === 'INBOX';

  return (
    <aside className={`w-56 bg-[#f5f6f7] border-r border-gray-200 flex flex-col ${className}`}>
      {/* ═══ 顶部: 写邮件按钮 ═══ */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => setActiveView('compose')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#066da5] text-white text-sm font-medium rounded-lg hover:bg-[#05588a] transition-colors shadow-sm"
        >
          ✏️ 写邮件
        </button>
      </div>

      {/* ═══ 功能导航 ═══ */}
      <div className="px-3 pb-1">
        <div className="flex flex-col gap-0.5">
          <NavItem icon="📥" label="统一收件箱" count={unifiedUnseen} active={activeView === 'mail' && currentAccount === null} onClick={() => {
            setCurrentAccount(null);
            setCurrentFolder('INBOX');
            setActiveView('mail');
            onSelectFolder?.();
          }} />
          <NavItem icon="👤" label="通讯录" onClick={() => setActiveView('contacts')} />
          <NavItem icon="🔑" label="API 密钥" onClick={() => setActiveView('apikeys')} />
          <NavItem icon="📄" label="API 文档" onClick={() => setActiveView('docs')} />
          <NavItem icon="⚙️" label="设置" onClick={() => setActiveView('settings')} />
        </div>
      </div>

      <div className="border-t border-gray-200 mx-3" />

      {/* ═══ 邮箱账户列表 ═══ */}
      <div className="flex-1 overflow-y-auto">
        {accountFolders.length === 0 ? (
          <div className="px-3 py-3 space-y-2 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 bg-gray-200 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ) : (
          accountFolders.map((group) => (
            <div key={group.account_id} className="mb-1">
              {/* 账户标题 */}
              <div
                onClick={() => toggleAccount(group.account_id)}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
              >
                <span className="text-xs">{expandedAccounts.has(group.account_id) ? '▼' : '▶'}</span>
                <span className="truncate">{group.account_name}</span>
                <span className="text-[10px] text-gray-400 normal-case font-normal">{group.account_email}</span>
              </div>

              {/* 账户的文件夹列表 */}
              {expandedAccounts.has(group.account_id) && (
                <div className="space-y-0.5 px-1 pb-1">
                  {group.folders.map((folder) => {
                    const isSelected = currentFolder === folder.name && currentAccount === group.account_id;
                    return (
                      <FolderItem
                        key={`${group.account_id}-${folder.name}`}
                        folder={folder}
                        selected={isSelected}
                        onSelect={() => handleSelectFolder(group.account_id, folder.name)}
                      />
                    );
                  })}
                  {group.folders.length === 0 && (
                    <div className="px-3 py-1 text-[10px] text-gray-400">正在加载...</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ═══ 底部状态 ═══ */}
      <div className="px-3 py-2 border-t border-gray-200 space-y-1">
        <div className="flex items-center gap-1.5 px-3 text-[10px]">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            imapStatus?.connected ? 'bg-green-500' : 'bg-red-400'
          }`} />
          <span className="text-gray-400">
            {imapStatus?.connected ? '已连接' : '未连接'}
          </span>
          <button
            onClick={() => {
              fetchImapStatus().then(setImapStatus).catch(() => {});
              window.dispatchEvent(new CustomEvent('sidebar-refresh'));
            }}
            className="ml-auto text-gray-300 hover:text-[#066da5] transition-colors"
            title="刷新"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {imapStatus?.last_sync && (
            <span className="text-gray-300 ml-1">
              {new Date(imapStatus.last_sync).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="text-[10px] text-gray-400 px-3 mb-1">
          {flatFolders.length} 个文件夹 · {unseenTotal} 封未读
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          🚪 退出登录
        </button>
      </div>
    </aside>
  );
}

/** 导航项目组件 */
function NavItem({ icon, label, count, active, onClick }: { icon: string; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded text-left ${
        active
          ? 'bg-[#d0e2f3] text-[#066da5] font-medium'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="flex-shrink-0 bg-[#066da5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
