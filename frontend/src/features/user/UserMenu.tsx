import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailStore } from '@/stores/mail';
import { useAuthStore } from '@/stores/auth';
import { fetchProfile } from '@/api/user';

export default function UserMenu() {
  const navigate = useNavigate();
  const setActiveView = useMailStore((s) => s.setActiveView);
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile()
      .then((u) => { setUserName(u.username || u.email.split('@')[0]); setUserEmail(u.email); setDisplayName(u.name || u.username || u.email.split('@')[0]); })
      .catch(() => {});
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    useAuthStore.getState().clearAuth();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-[#066da5] text-white flex items-center justify-center text-[11px] font-bold">
          {(displayName || '?')[0].toUpperCase()}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 text-sm">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="font-medium text-gray-800 truncate">{displayName}</div>
            <div className="text-xs text-gray-400 truncate">@{userName} · {userEmail}</div>
          </div>
          <button
            onClick={() => { setOpen(false); setActiveView('profile'); }}
            className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <span>👤</span> 个人信息
          </button>
          <button
            onClick={() => { setOpen(false); setActiveView('settings'); }}
            className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <span>⚙️</span> 邮箱设置
          </button>
          <button
            onClick={() => { setOpen(false); setActiveView('apikeys'); }}
            className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <span>🔑</span> API 密钥
          </button>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <span>🚪</span> 退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
