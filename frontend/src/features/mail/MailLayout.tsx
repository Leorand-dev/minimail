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
import MemosPage from '@/features/memos/MemosPage';

/** Header titles & actions for each view */
const VIEW_CONFIG: Record<string, { title: string; icon: string }> = {
  mail:     { title: '收件箱',    icon: '📥' },
  compose:  { title: '写邮件',    icon: '✏️' },
  settings: { title: '设置',      icon: '⚙️' },
  contacts: { title: '通讯录',    icon: '👤' },
  apikeys:  { title: 'API 密钥', icon: '🔑' },
  profile:  { title: '个人信息',  icon: '👤' },
  docs:     { title: 'API 文档',  icon: '📄' },
  memos:    { title: '笔记库',    icon: '📝' },
};

export default function MailLayout() {
  const { currentFolder, page, searchQuery, searchDateFrom, searchDateTo,
    searchUnreadOnly, activeView, setActiveView, activePane, setActivePane, totalMessages,
    setFolders, setMessages, setLoading, setError } = useMailStore();

  const initRef = useRef(false);
  const skipImapRef = useRef(false);

  // ── 初始化: 只执行一次 ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // 先尝试 demo (快速, 避免 IMAP 超时阻塞)
    let demoLoaded = false;
    (async () => {
      try {
        const res = await api.get('/mail/demo');
        setFolders(res.data.folders);
        setError(null);
        const folderMsgs = res.data.messages?.messages || [];
        const filtered = folderMsgs;
        setMessages(filtered, filtered.length, 1, 1);
        applyReadUids();
        setLoading(false);
        demoLoaded = true;
      } catch { setLoading(false); }
    })();

    // 再尝试真实 IMAP (设 3 秒超时)
    (async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('IMAP timeout')), 3000)
        );
        const realFolders = await Promise.race([fetchFolders(), timeout]);
        if (realFolders && realFolders.length > 0) {
          setFolders(realFolders);
          skipImapRef.current = false;
        }
      } catch {
        if (!demoLoaded) {
          try {
            const res = await api.get('/mail/demo');
            setFolders(res.data.folders);
            const folderMsgs = res.data.messages?.messages || [];
            setMessages(folderMsgs, folderMsgs.length, 1, 1);
            applyReadUids();
          } catch {}
        }
        skipImapRef.current = true;
      }
    })();
  }, [setFolders, setMessages, setError]);

  // ── 切换文件夹/搜索/翻页: 加载邮件 ──
  // 跳过 mount 时的首次执行 (init 已处理)
  const mountedRef = useRef(false);
  const lastKeyRef = useRef('');

  // 将本地已读状态合并到当前消息列表
  const applyReadUids = () => {
    const s = useMailStore.getState();
    if (s.readUids.size === 0) return;
    const patched = s.messages.map((m) =>
      s.readUids.has(m.uid) && !m.is_read
        ? { ...m, is_read: true, flags: [...(m.flags || []), '\\Seen'] as string[] }
        : m
    );
    if (patched.some((m, i) => m !== s.messages[i])) {
      s.setMessages(patched, s.totalMessages, s.page, s.totalPages);
    }
  };

  const loadMessages = useCallback(async () => {
    const store = useMailStore.getState();
    const cacheKey = `${store.currentAccount || '__unified__'}|${store.currentFolder}|${store.searchQuery}|${store.page}`;
    
    // 如果已有数据且 cache 未变, 跳过加载
    if (lastKeyRef.current === cacheKey && store.messages.length > 0 && !store.loading) {
      return;
    }
    lastKeyRef.current = cacheKey;

    setLoading(true);
    setError(null);

    // Demo 模式: 快速过滤本地 demo 数据, 不连 IMAP
    if (skipImapRef.current) {
      try {
        const res = await api.get('/mail/demo');
        const folderMsgs = (res.data.messages?.messages || []);
        const folder = currentFolder.toLowerCase();
        const filtered = folder === 'inbox' ? folderMsgs
          : folderMsgs.filter((m: any) => {
              if (folder === 'sent') return m.from_?.email?.includes('demo');
              if (folder === 'junk' || folder === 'drafts' || folder === 'trash' || folder === 'archive') return false;
              return true;
            });
        setMessages(filtered, filtered.length, 1, 1);
        applyReadUids();
      } catch { setError('加载失败'); }
      finally { setLoading(false); }
      return;
    }

    // 真实 IMAP 模式
    try {
      const res = searchQuery.trim()
        ? await searchApi(searchQuery, currentFolder, page, 50, {
            date_from: searchDateFrom || undefined,
            date_to: searchDateTo || undefined,
            unread_only: searchUnreadOnly || undefined,
          })
        : await fetchMessages(currentFolder, page, 50);
      setMessages(res.messages, res.total, res.page, res.total_pages);
      applyReadUids();
    } catch {
      // IMAP 失败 — 降级到 demo
      skipImapRef.current = true;
      try {
        const res = await api.get('/mail/demo');
        const folderMsgs = (res.data.messages?.messages || []);
        setMessages(folderMsgs, folderMsgs.length, 1, 1);
        applyReadUids();
      } catch { setError('加载邮件失败'); }
    }
    finally { setLoading(false); }
  }, [currentFolder, page, searchQuery, searchDateFrom, searchDateTo, searchUnreadOnly, setMessages, setLoading, setError]);

  // 加载邮件: 首次 mount 由 init 处理, 后续变更才触发
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return; // 跳过首次 (init 已处理)
    }
    if (activeView === 'mail') loadMessages();
  }, [loadMessages, activeView]);

  // 监听侧栏刷新事件
  useEffect(() => {
    const handler = () => {
      lastKeyRef.current = ''; // 重置缓存, 强制刷新
      if (activeView === 'mail') loadMessages();
    };
    window.addEventListener('sidebar-refresh', handler);
    return () => window.removeEventListener('sidebar-refresh', handler);
  }, [activeView, loadMessages]);

  const cfg = VIEW_CONFIG[activeView] || VIEW_CONFIG.mail;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-sm">
      {/* ═══ 统一顶部 Header ═══ */}
      {activeView === 'mail' ? (
        <Toolbar />
      ) : (
        <header className="flex items-center gap-2 px-3 h-[55px] border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-md bg-[#066da5] flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-semibold text-gray-700 hidden sm:inline">Minimail</span>
          </div>
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
        {activeView === 'memos' && <MemosPage />}
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
