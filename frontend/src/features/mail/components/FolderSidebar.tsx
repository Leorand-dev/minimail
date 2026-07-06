import React from 'react';
import { useMailStore } from '@/stores/mail';
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
  const folders = useMailStore((s) => s.folders);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const setCurrentFolder = useMailStore((s) => s.setCurrentFolder);
  const unseenTotal = folders.reduce((sum, f) => sum + (f.unseen || 0), 0);

  const hierarchy = buildHierarchy(folders);

  return (
    <aside className={`w-56 bg-[#f5f6f7] border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          文件夹
        </h2>
      </div>

      {/* Folder list */}
      <nav className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {hierarchy.map(({ folder, depth }) => (
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
        ))}
      </nav>

      {/* Quota / bottom */}
      <div className="px-3 py-2 border-t border-gray-200">
        <button
          onClick={() => window.location.href = '/contacts'}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
        >
          👤 通讯录
        </button>
        <div className="mt-1 text-[10px] text-gray-400 px-3">
          {folders.length} 个文件夹 · {unseenTotal} 封未读
        </div>
      </div>
    </aside>
  );
}
