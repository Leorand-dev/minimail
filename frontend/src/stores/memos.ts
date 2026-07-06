/**
 * Minimail — 笔记库 Note Zustand 状态
 */

import { create } from 'zustand';
import type { Note, NoteTag } from '@/api/memos';

interface NotesState {
  notes: Note[];
  tags: NoteTag[];
  activeTag: string | null;
  searchQuery: string;
  loading: boolean;
  editingNote: Note | null;  // null = 新建模式

  setNotes: (notes: Note[]) => void;
  setTags: (tags: NoteTag[]) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchQuery: (q: string) => void;
  setLoading: (v: boolean) => void;
  setEditingNote: (note: Note | null) => void;
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

  setNotes: (notes) => set({ notes }),
  setTags: (tags) => set({ tags }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (v) => set({ loading: v }),
  setEditingNote: (n) => set({ editingNote: n }),

  updateNoteInList: (note) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === note.id ? note : n)),
    })),

  removeNoteFromList: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
    })),
}));
