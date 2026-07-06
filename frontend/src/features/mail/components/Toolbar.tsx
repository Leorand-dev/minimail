import React, { useState, useRef, useEffect } from 'react';
import { useMailStore } from '@/stores/mail';

export default function Toolbar() {
  const searchQuery = useMailStore((s) => s.searchQuery);
  const setSearchQuery = useMailStore((s) => s.setSearchQuery);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const totalMessages = useMailStore((s) => s.totalMessages);
  const setPage = useMailStore((s) => s.setPage);
  const loading = useMailStore((s) => s.loading);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(val);
      setPage(1);
    }, 300);
  };

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
      {/* Logo + Title */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-md bg-[#066da5] flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <span className="font-semibold text-gray-700 hidden sm:inline">Webmail</span>
      </div>

      {/* Search bar (Roundcube 风格: 圆角搜索框 + 清除按钮) */}
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="搜索邮件..."
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:border-[#066da5] focus:outline-none focus:ring-1 focus:ring-[#066da5] transition-colors"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('');
              setSearchQuery('');
              setPage(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {}}
          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
          title="刷新"
        >
          🔄
        </button>
        <button
          onClick={() => {}}
          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
          title="写邮件"
        >
          ✏️
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
      )}

      {/* Folder info */}
      <span className="text-xs text-gray-400 hidden md:inline">
        {currentFolder} · {totalMessages} 封
      </span>
    </header>
  );
}
