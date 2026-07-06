import { create } from 'zustand';
import type { Folder, MessageSummary, MessageDetail } from '@/api/mail';

export type Pane = 'folders' | 'list' | 'preview';
/** 邮件页主视图 */
export type MailView = 'mail' | 'compose' | 'settings' | 'contacts' | 'apikeys' | 'profile' | 'docs';

/** 撰写页预填充数据 (回复/转发) */
export interface ComposePrefill {
  mode: 'reply' | 'reply_all' | 'forward';
  to: string;
  cc?: string;
  subject: string;
  body: string;
  from_addr?: string;
  in_reply_to?: string;
  references?: string;
}

interface MailState {
  folders: Folder[];
  currentFolder: string;
  messages: MessageSummary[];
  totalMessages: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activePane: Pane;
  activeView: MailView;
  selectedMessage: MessageDetail | null;
  selectedUid: number | null;
  previewMessage: MessageDetail | null;
  composePrefill: ComposePrefill | null;

  setFolders: (folders: Folder[]) => void;
  setMessages: (messages: MessageSummary[], total?: number, page?: number, totalPages?: number) => void;
  setTotalMessages: (n: number) => void;
  setCurrentFolder: (f: string) => void;
  setPage: (p: number) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setSearchQuery: (q: string) => void;
  setActivePane: (p: Pane) => void;
  setActiveView: (v: MailView) => void;
  setSelectedMessage: (m: MessageDetail | null) => void;
  setSelectedUid: (uid: number | null) => void;
  setPreviewMessage: (m: MessageDetail | null) => void;
  setComposePrefill: (p: ComposePrefill | null) => void;
}

export const useMailStore = create<MailState>((set) => ({
  folders: [],
  currentFolder: 'INBOX',
  messages: [],
  totalMessages: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
  searchQuery: '',
  activePane: 'list',
  activeView: 'mail',
  selectedMessage: null,
  selectedUid: null,
  previewMessage: null,
  composePrefill: null,

  setFolders: (folders) => set({ folders }),
  setMessages: (messages, total, page, totalPages) =>
    set({ messages, totalMessages: total ?? 0, page: page ?? 1, totalPages: totalPages ?? 1 }),
  setTotalMessages: (n) => set({ totalMessages: n }),
  setCurrentFolder: (currentFolder) => set({ currentFolder, page: 1 }),
  setPage: (page) => set({ page }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
  setActivePane: (activePane) => set({ activePane }),
  setActiveView: (activeView) => set({ activeView, selectedMessage: null, previewMessage: null }),
  setSelectedMessage: (selectedMessage) => set({ selectedMessage }),
  setSelectedUid: (selectedUid) => set({ selectedUid }),
  setPreviewMessage: (previewMessage) => set({ previewMessage }),
  setComposePrefill: (composePrefill) => set({ composePrefill }),
}));
