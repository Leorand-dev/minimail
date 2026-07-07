import { useState, useRef } from 'react';
import { useMailStore } from '@/stores/mail';
import UserMenu from '@/features/user/UserMenu';
import SearchPanel from '@/features/search/SearchPanel';
import type { UnifiedSearchItem } from '@/api/search';

export default function Toolbar() {
  const setActiveView = useMailStore((s) => s.setActiveView);
  const searchQuery = useMailStore((s) => s.searchQuery);
  const setSearchQuery = useMailStore((s) => s.setSearchQuery);
  const searchDateFrom = useMailStore((s) => s.searchDateFrom);
  const setSearchDateFrom = useMailStore((s) => s.setSearchDateFrom);
  const searchDateTo = useMailStore((s) => s.searchDateTo);
  const setSearchDateTo = useMailStore((s) => s.setSearchDateTo);
  const searchUnreadOnly = useMailStore((s) => s.searchUnreadOnly);
  const setSearchUnreadOnly = useMailStore((s) => s.setSearchUnreadOnly);
  const searchShowFilters = useMailStore((s) => s.searchShowFilters);
  const setSearchShowFilters = useMailStore((s) => s.setSearchShowFilters);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const totalMessages = useMailStore((s) => s.totalMessages);
  const setPage = useMailStore((s) => s.setPage);
  const loading = useMailStore((s) => s.loading);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(val);
      setPage(1);
    }, 300);
  };

  const hasFilters = searchDateFrom || searchDateTo || searchUnreadOnly;

  return (
    <header className="flex items-center gap-2 px-3 h-[55px] border-b border-gray-200 bg-white relative">
      {/* Logo + Title */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-md bg-[#066da5] flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <span className="font-semibold text-gray-700 hidden sm:inline">Minimail</span>
      </div>

      {/* Search bar + filter toggle */}
      <div className="relative flex-1 max-w-md">
      <input
        type="text"
        value={searchInput}
        onChange={handleSearchChange}
        onFocus={() => { setShowGlobalSearch(true); setGlobalQuery(searchInput); }}
        placeholder="搜索邮件..."
        className="w-full pl-8 pr-20 py-1.5 text-sm border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:border-[#066da5] focus:outline-none focus:ring-1 focus:ring-[#066da5] transition-colors"
      />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Filter toggle button */}
        <button
          onClick={() => setSearchShowFilters(!searchShowFilters)}
          className={`absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded ${
            hasFilters ? 'text-[#066da5]' : 'text-gray-400 hover:text-gray-600'
          }`}
          title="筛选"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>

        {/* Clear button */}
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              setSearchQuery('');
              setPage(1);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Global search toggle */}
        <button
          onClick={() => { setShowGlobalSearch(!showGlobalSearch); setGlobalQuery(searchInput); }}
          className={`absolute right-14 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-[#066da5] transition-colors`}
          title="全局搜索"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Global search panel */}
      {showGlobalSearch && (
        <SearchPanel
          query={globalQuery}
          onClose={() => setShowGlobalSearch(false)}
          onSelectItem={(item) => {
            if (item.type_ === 'note') {
              setActiveView('memos');
            }
          }}
        />
      )}

      {/* Quick action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActiveView('settings')}
          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
          title="设置"
        >
          ⚙️
        </button>
        <button
          onClick={() => setActiveView('compose')}
          className="px-2 py-1 text-xs text-white bg-[#066da5] hover:bg-[#05588a] rounded"
          title="写邮件"
        >
          ✏️ 写邮件
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
      )}

      {/* Folder info */}
      <span className="text-xs text-gray-400 hidden md:inline mr-1">
        {currentFolder} · {totalMessages} 封
      </span>
      <div className="flex-1" />
      <UserMenu />

      {/* ═══ Search filter panel ═══ */}
      {searchShowFilters && (
        <div className="absolute left-0 right-0 top-[55px] bg-white border-b border-gray-200 shadow-sm z-10 px-4 py-2 flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-gray-500">从</span>
            <input
              type="date"
              value={searchDateFrom}
              onChange={(e) => setSearchDateFrom(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-gray-500">到</span>
            <input
              type="date"
              value={searchDateTo}
              onChange={(e) => setSearchDateTo(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={searchUnreadOnly}
              onChange={(e) => setSearchUnreadOnly(e.target.checked)}
              className="accent-[#066da5]"
            />
            <span className="text-gray-600">仅未读</span>
          </label>
          {(hasFilters || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchInput('');
                setSearchDateFrom('');
                setSearchDateTo('');
                setSearchUnreadOnly(false);
                setPage(1);
              }}
              className="ml-auto px-2 py-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
            >
              清除筛选
            </button>
          )}
        </div>
      )}
    </header>
  );
}
