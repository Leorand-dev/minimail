import { create } from 'zustand';
import type { Folder, MessageSummary, MessageDetail } from '@/api/mail';

export type Pane = 'folders' | 'list' | 'preview';
/** 邮件页主视图: mail=收件箱, compose=撰写, settings=设置, contacts=通讯录, apikeys=API密钥 */
export type MailView = 'mail' | 'compose' | 'settings' | 'contacts' | 'apikeys';

/** 撰写页预填充数据 (回复/转发) */
export interface ComposePrefill {
  mode: 'reply' | 'reply_all' | 'forward';
  to: string;
  cc?: string;
  subject: string;
  body: string;
  from_addr?: string;
  in_reply_to?: string;
}

interface MailState {
  folders: Folder[];
  currentFolder: string;
  messages: MessageSummary[];
  totalMessages: number;
  page: number;
  totalPages: number;
  selectedUid: number | null;
  previewMessage: MessageDetail | null;
  searchQuery: string;
  loading: boolean;
  activePane: Pane;
  error: string | null;
  activeView: MailView;
  composePrefill: ComposePrefill | null;

  setFolders: (folders: Folder[]) => void;
  setCurrentFolder: (folder: string) => void;
  setMessages: (messages: MessageSummary[], total: number, page: number, totalPages: number) => void;
  setSelectedUid: (uid: number | null) => void;
  setPreviewMessage: (msg: MessageDetail | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setActivePane: (pane: Pane) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
  setActiveView: (view: MailView) => void;
  setComposePrefill: (data: ComposePrefill | null) => void;
}

export const useMailStore = create<MailState>((set) => ({
  folders: [],
  currentFolder: 'INBOX',
  messages: [],
  totalMessages: 0,
  page: 1,
  totalPages: 1,
  selectedUid: null,
  previewMessage: null,
  searchQuery: '',
  loading: false,
  activePane: 'list',
  error: null,
  activeView: 'mail',
  composePrefill: null,

  setFolders: (folders) => set({ folders, activeView: 'mail' }),
  setCurrentFolder: (folder) => set({ currentFolder: folder, page: 1, selectedUid: null, previewMessage: null }),
  setMessages: (messages, total, page, totalPages) =>
    set({ messages, totalMessages: total, page, totalPages }),
  setSelectedUid: (uid) => set({ selectedUid: uid }),
  setPreviewMessage: (msg) => set({ previewMessage: msg }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLoading: (loading) => set({ loading }),
  setActivePane: (pane) => set({ activePane: pane }),
  setError: (error) => set({ error }),
  setPage: (page) => set({ page }),
  setActiveView: (view) => set({ activeView: view }),
  setComposePrefill: (data) => set({ composePrefill: data }),
}));
