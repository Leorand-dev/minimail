import { create } from 'zustand';
import type { Folder, MessageSummary, MessageDetail } from '@/api/mail';

export type Pane = 'folders' | 'list' | 'preview';

interface MailState {
  /** 当前邮箱文件夹 */
  folders: Folder[];
  /** 选中的文件夹名 */
  currentFolder: string;
  /** 当前邮件列表 */
  messages: MessageSummary[];
  /** 邮件总数 */
  totalMessages: number;
  /** 当前页码 */
  page: number;
  /** 总页数 */
  totalPages: number;
  /** 选中的邮件 UID */
  selectedUid: number | null;
  /** 预览中的邮件详情 */
  previewMessage: MessageDetail | null;
  /** 搜索关键词 */
  searchQuery: string;
  /** 加载状态 */
  loading: boolean;
  /** 当前可见面板 (适配响应式) */
  activePane: Pane;
  /** 错误信息 */
  error: string | null;

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

  setFolders: (folders) => set({ folders }),
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
}));
