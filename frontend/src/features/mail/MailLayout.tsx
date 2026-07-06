import React, { useEffect, useCallback, useRef } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchFolders, fetchMessages, searchMessages as searchApi } from '@/api/mail';
import api from '@/api/client';
import FolderSidebar from '@/features/mail/components/FolderSidebar';
import Toolbar from '@/features/mail/components/Toolbar';
import MessageList from '@/features/mail/components/MessageList';
import PreviewPane from '@/features/mail/components/PreviewPane';
import ComposeContent from '@/features/compose/ComposePage';
import SettingsContent from '@/features/settings/SettingsPage';
import ContactsContent from '@/features/contacts/ContactsPage';
import ApiKeysContent from '@/features/api-keys/ApiKeysPanel';
import UserMenu from '@/features/user/UserMenu';
import ProfilePanel from '@/features/user/ProfilePanel';
import DocsPage from '@/features/docs/DocsPage';

/** Header titles & actions for each view */
const VIEW_CONFIG: Record<string, { title: string; icon: string }> = {
  mail:     { title: '收件箱',    icon: '📥' },
  compose:  { title: '写邮件',    icon: '✏️' },
  settings: { title: '设置',      icon: '⚙️' },
  contacts: { title: '通讯录',    icon: '👤' },
  apikeys:  { title: 'API 密钥', icon: '🔑' },
  profile:  { title: '个人信息',  icon: '👤' },
  docs:     { title: 'API 文档',  icon: '📄' },
};

export default function MailLayout() {
  const { currentFolder, page, searchQuery, searchDateFrom, searchDateTo,
    searchUnreadOnly, activeView, setActiveView, activePane, setActivePane, totalMessages,
    setFolders, setMessages, setLoading, setError } = useMailStore();

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const tryDemoData = async () => {
      try {
        const res = await api.get('/mail/demo');
        setFolders(res.data.folders);
        setError(null);
        // 加载 demo 邮件
        setLoading(true);
        const folderMsgs = res.data.messages?.messages || [];
        setMessages(folderMsgs, folderMsgs.length, 1, 1);
        setLoading(false);
        return res.data;
      } catch { setError('加载示例数据失败'); return null; }
    };
    fetchFolders()
      .then(setFolders)
      .catch(async () => {
        // IMAP 失败 — 跳过账户检查直接加载示例数据
        await tryDemoData();
      });
  }, [setFolders, setError, setLoading]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = searchQuery.trim()
        ? await searchApi(searchQuery, currentFolder, page, 50, {
            date_from: searchDateFrom || undefined,
            date_to: searchDateTo || undefined,
            unread_only: searchUnreadOnly || undefined,
          })
        : await fetchMessages(currentFolder, page, 50);
      setMessages(res.messages, res.total, res.page, res.total_pages);
    } catch {
      // IMAP 失败 — 尝试从 demo 端点获取消息
      try {
        const demoRes = await api.get('/mail/demo');
        const folderMsgs = (demoRes.data.messages?.messages || []);
        const folder = currentFolder.toLowerCase();
        const filtered = folder === 'inbox' ? folderMsgs
          : folderMsgs.filter((m: any) => {
              if (folder === 'sent') return m.from_?.email?.includes('demo');
              if (folder === 'junk') return false;
              if (folder === 'drafts' || folder === 'trash' || folder === 'archive') return false;
              return true;
            });
        setMessages(filtered, filtered.length, 1, 1);
      } catch {
        setError('加载邮件失败');
      }
    }
    finally { setLoading(false); }
  }, [currentFolder, page, searchQuery, searchDateFrom, searchDateTo, searchUnreadOnly, setMessages, setLoading, setError]);

  useEffect(() => { if (activeView === 'mail') loadMessages(); }, [loadMessages, activeView]);

  const cfg = VIEW_CONFIG[activeView] || VIEW_CONFIG.mail;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-sm">
      {/* ═══ 统一顶部 Header ═══ */}
      {activeView === 'mail' ? (
        <Toolbar />
      ) : (
        <header className="flex items-center gap-2 px-3 h-[55px] border-b border-gray-200 bg-white">
          {/* Logo + App Name (same as Toolbar) */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-md bg-[#066da5] flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-semibold text-gray-700 hidden sm:inline">Minimail</span>
          </div>

          {/* Back + Title */}
          <button
            onClick={() => setActiveView('mail')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#066da5] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回</span>
          </button>
          <span className="text-sm font-semibold text-gray-700 ml-1">{cfg.icon} {cfg.title}</span>
          {(activeView === 'contacts' || activeView === 'apikeys') && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('panel-new'))}
              className="px-2 py-1 text-xs text-white bg-[#066da5] hover:bg-[#05588a] rounded"
            >
              + 新建
            </button>
          )}
          {activeView === 'compose' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('compose-send'))}
              className="px-2 py-1 text-xs text-white bg-[#066da5] hover:bg-[#05588a] rounded font-medium"
            >
              发送
            </button>
          )}
          <div className="flex-1" />
          <UserMenu />
        </header>
      )}

      {/* ═══ 三栏主体 ═══ */}
      <div className="flex flex-1 overflow-hidden">
        <FolderSidebar
          className={activeView !== 'mail' ? 'hidden lg:block lg:w-56' : activePane === 'folders' ? 'block' : 'hidden lg:block'}
          onSelectFolder={() => setActivePane('list')}
        />

        {activeView === 'mail' && (
          <>
            <MessageList className={activePane === 'list' ? 'flex flex-col flex-1' : 'hidden lg:flex lg:flex-col lg:flex-1'} onSelectMessage={() => setActivePane('preview')} />
            <PreviewPane className={activePane === 'preview' ? 'block flex-1' : 'hidden lg:block lg:flex-1'} />
          </>
        )}

        {activeView === 'compose' && <ComposeContent onBack={() => setActiveView('mail')} />}
        {activeView === 'settings' && <SettingsContent onBack={() => setActiveView('mail')} />}
        {activeView === 'contacts' && <ContactsContent onBack={() => setActiveView('mail')} />}
        {activeView === 'apikeys' && <ApiKeysContent />}
        {activeView === 'profile' && <ProfilePanel />}
        {activeView === 'docs' && <DocsPage />}
      </div>

      {/* ═══ 底部导航 (手机) ═══ */}
      {activeView === 'mail' && (
        <div className="flex border-t border-gray-200 lg:hidden">
          {(['folders', 'list', 'preview'] as const).map((pane) => (
            <button key={pane} onClick={() => setActivePane(pane)}
              className={`flex-1 py-2 text-xs font-medium text-center ${activePane === pane ? 'text-[#066da5] bg-[#e8f4fd]' : 'text-gray-500'}`}
            >
              {pane === 'folders' ? '📁 文件夹' : pane === 'list' ? `✉️ 邮件 (${totalMessages})` : '👁️ 预览'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
