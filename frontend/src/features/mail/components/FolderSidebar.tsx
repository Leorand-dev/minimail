import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailStore } from '@/stores/mail';
import { useAuthStore } from '@/stores/auth';
import type { Folder } from '@/api/mail';

interface FolderSidebarProps {
  className?: string;
  onSelectFolder?: () => void;
}

/** Render a single folder item with indentation for hierarchy */
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
    folder.name === 'Archive' ? '📦' :
    folder.is_container ? '📂' : '📁';

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
      <span className="truncate flex-1">{folder.name}</span>
      {folder.unseen > 0 && (
        <span className="flex-shrink-0 bg-[#066da5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {folder.unseen > 99 ? '99+' : folder.unseen}
        </span>
      )}
    </div>
  );
}

/** Build hierarchy from flat folder list */
function buildHierarchy(folders: Folder[]): { folder: Folder; depth: number }[] {
  const result: { folder: Folder; depth: number }[] = [];
  const added = new Set<string>();

  // INBOX first
  const inbox = folders.find((f) => f.name === 'INBOX');
  if (inbox) {
    result.push({ folder: inbox, depth: 0 });
    added.add('INBOX');
  }

  // Standard folders
  for (const name of ['Sent', 'Drafts', 'Junk', 'Trash', 'Archive']) {
    const f = folders.find((folder) => folder.name === name);
    if (f && !added.has(name)) {
      result.push({ folder: f, depth: 0 });
      added.add(name);
    }
  }

  // Remaining non-container folders
  for (const f of folders) {
    if (!added.has(f.name) && !f.is_container) {
      const depth = f.hierarchy.length > 1 ? f.hierarchy.length - 1 : 0;
      result.push({ folder: f, depth });
      added.add(f.name);
    }
  }

  return result;
}

export default function FolderSidebar({ className = '', onSelectFolder }: FolderSidebarProps) {
  const navigate = useNavigate();
  const folders = useMailStore((s) => s.folders);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const setCurrentFolder = useMailStore((s) => s.setCurrentFolder);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const unseenTotal = folders.reduce((sum, f) => sum + (f.unseen || 0), 0);

  const hierarchy = buildHierarchy(folders);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className={`w-56 bg-[#f5f6f7] border-r border-gray-200 flex flex-col ${className}`}>
      {/* ═══ 顶部: 写邮件按钮 ═══ */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => navigate('/compose')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#066da5] text-white text-sm font-medium rounded-lg hover:bg-[#05588a] transition-colors shadow-sm"
        >
          ✏️ 写邮件
        </button>
      </div>

      {/* ═══ 功能导航 ═══ */}
      <div className="px-3 pb-1">
        <div className="flex flex-col gap-0.5">
          <NavItem icon="📥" label="收件箱" active={currentFolder === 'INBOX'} onClick={() => { setCurrentFolder('INBOX'); onSelectFolder?.(); }} />
          <NavItem icon="👤" label="通讯录" onClick={() => navigate('/contacts')} />
          <NavItem icon="⚙️" label="设置" onClick={() => navigate('/settings')} />
        </div>
      </div>

      {/* ═══ 分隔线 ═══ */}
      <div className="border-t border-gray-200 mx-3" />

      {/* ═══ 文件夹标题 ═══ */}
      <div className="px-3 pt-2 pb-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          文件夹
        </h2>
      </div>

      {/* ═══ 文件夹列表 ═══ */}
      <nav className="flex-1 overflow-y-auto pb-1 space-y-0.5 px-1">
        {folders.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400 text-center">
            暂无文件夹<br />
            <span className="text-[10px]">请先在设置中配置邮箱</span>
          </div>
        ) : (
          hierarchy.map(({ folder, depth }) => (
            <FolderItem
              key={folder.name}
              folder={folder}
              depth={depth}
              selected={folder.name === currentFolder}
              onSelect={() => {
                setCurrentFolder(folder.name);
                onSelectFolder?.();
              }}
            />
          ))
        )}
      </nav>

      {/* ═══ 底部状态 ═══ */}
      <div className="px-3 py-2 border-t border-gray-200">
        <div className="text-[10px] text-gray-400 px-3 mb-1">
          {folders.length} 个文件夹 · {unseenTotal} 封未读
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
function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
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
      <span>{label}</span>
    </button>
  );
}
