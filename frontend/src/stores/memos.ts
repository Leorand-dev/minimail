/**
 * Minimail — 笔记库 Note Zustand 状态
 */

import { create } from 'zustand';
import type { Note, NoteTag } from '@/api/memos';

/** 笔记库子视图 */
export type NoteView = 'list' | 'tags' | 'settings';

interface NotesState {
  notes: Note[];
  tags: NoteTag[];
  activeTag: string | null;
  searchQuery: string;
  loading: boolean;
  editingNote: Note | null;  // null = 新建模式
  noteView: NoteView;        // 笔记库子视图
  sidebarExpanded: boolean;  // 侧栏笔记库展开/折叠

  setNotes: (notes: Note[]) => void;
  setTags: (tags: NoteTag[]) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchQuery: (q: string) => void;
  setLoading: (v: boolean) => void;
  setEditingNote: (note: Note | null) => void;
  setNoteView: (v: NoteView) => void;
  setSidebarExpanded: (v: boolean) => void;
  updateNoteInList: (note: Note) => void;
  removeNoteFromList: (id: string) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  tags: [],
  activeTag: null,
  searchQuery: '',
  loading: false,
  editingNote: null,
  noteView: 'list',
  sidebarExpanded: true,

  setNotes: (notes) => set({ notes }),
  setTags: (tags) => set({ tags }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (v) => set({ loading: v }),
  setEditingNote: (n) => set({ editingNote: n }),
  setNoteView: (v) => set({ noteView: v }),
  setSidebarExpanded: (v) => set({ sidebarExpanded: v }),

  updateNoteInList: (note) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === note.id ? note : n)),
    })),

  removeNoteFromList: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
    })),
}));
