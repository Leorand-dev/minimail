/**
 * MemoList — 笔记列表 (时间线布局)
 */


import type { Note } from '@/api/memos';
import MemoCard from './MemoCard';
import { useNotesStore } from '@/stores/memos';

interface MemoListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export default function MemoList({ notes, onEdit, onDelete, onTogglePin }: MemoListProps) {
  const loading = useNotesStore((s) => s.loading);

  if (loading && notes.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-4xl mb-3">📝</span>
        <p className="text-sm">没有笔记</p>
        <p className="text-xs mt-1">点击右上角「✏️ 新建」创建第一条笔记</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {notes.map((note) => (
        <MemoCard
          key={note.id}
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}
