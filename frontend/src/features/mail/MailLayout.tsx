import React, { useEffect, useCallback, useRef } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchFolders, fetchMessages, searchMessages as searchApi } from '@/api/mail';
import FolderSidebar from '@/features/mail/components/FolderSidebar';
import Toolbar from '@/features/mail/components/Toolbar';
import MessageList from '@/features/mail/components/MessageList';
import PreviewPane from '@/features/mail/components/PreviewPane';
import ComposePanel from '@/features/compose/ComposePanel';
import SettingsPanel from '@/features/settings/SettingsPanel';
import ContactsPanel from '@/features/contacts/ContactsPanel';
import ApiKeysPanel from '@/features/api-keys/ApiKeysPanel';

export default function MailLayout() {
  const {
    currentFolder,
    page,
    searchQuery,
    activeView,
    setActiveView,
    setFolders,
    setMessages,
    setLoading,
    setError,
    activePane,
    setActivePane,
    totalMessages,
  } = useMailStore();

  const initRef = useRef(false);

  // 初始化: 加载文件夹
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchFolders()
      .then(setFolders)
      .catch(() => setError('无法加载文件夹'));
  }, [setFolders, setError]);

  // 加载邮件列表
  const loadMessages = useCallback(async () => {
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
  }, [currentFolder, page, searchQuery, setMessages, setLoading, setError]);

  useEffect(() => {
    if (activeView === 'mail') loadMessages();
  }, [loadMessages, activeView]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-sm">
      {/* ═══ 顶部工具栏 (只有邮件视图显示) ═══ */}
      {activeView === 'mail' && <Toolbar />}

      {/* ═══ 三栏主体 ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧: 文件夹树 (始终显示) */}
        <FolderSidebar
          className={
            activeView !== 'mail'
              ? 'hidden lg:block lg:w-56'
              : activePane === 'folders'
                ? 'block'
                : 'hidden lg:block'
          }
          onSelectFolder={() => setActivePane('list')}
        />

        {/* 内容区: 根据 activeView 切换 */}
        {activeView === 'mail' && (
          <>
            {/* 中间: 邮件列表 */}
            <MessageList
              className={
                activePane === 'list'
                  ? 'flex flex-col flex-1'
                  : 'hidden lg:flex lg:flex-col lg:flex-1'
              }
              onSelectMessage={() => setActivePane('preview')}
            />

            {/* 右侧: 预览面板 */}
            <PreviewPane
              className={
                activePane === 'preview'
                  ? 'block flex-1'
                  : 'hidden lg:block lg:flex-1'
              }
            />
          </>
        )}

        {activeView === 'compose' && <ComposePanel />}
        {activeView === 'settings' && <SettingsPanel />}
        {activeView === 'contacts' && <ContactsPanel />}
        {activeView === 'apikeys' && <ApiKeysPanel />}
      </div>

      {/* ═══ 响应式底部导航 (phone/small 屏幕) ═══ */}
      {activeView === 'mail' && (
        <div className="flex border-t border-gray-200 lg:hidden">
          <button
            onClick={() => setActivePane('folders')}
            className={`flex-1 py-2 text-xs font-medium text-center ${
              activePane === 'folders' ? 'text-[#066da5] bg-[#e8f4fd]' : 'text-gray-500'
            }`}
          >
            📁 文件夹
          </button>
          <button
            onClick={() => setActivePane('list')}
            className={`flex-1 py-2 text-xs font-medium text-center ${
              activePane === 'list' ? 'text-[#066da5] bg-[#e8f4fd]' : 'text-gray-500'
            }`}
          >
            ✉️ 邮件 ({totalMessages})
          </button>
          <button
            onClick={() => setActivePane('preview')}
            className={`flex-1 py-2 text-xs font-medium text-center ${
              activePane === 'preview' ? 'text-[#066da5] bg-[#e8f4fd]' : 'text-gray-500'
            }`}
          >
            👁️ 预览
          </button>
        </div>
      )}
    </div>
  );
}
