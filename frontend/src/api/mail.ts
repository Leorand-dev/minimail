import api from '@/api/client';

export interface Folder {
  name: string;
  delim: string;
  flags: string[];
  subscribed: boolean;
  exists: number;
  unseen: number;
  recent: number;
  /** Hierarchy of this folder */
  hierarchy: string[];
  /** True if this folder cannot hold messages */
  is_container: boolean;
}

export interface Address {
  name: string;
  email: string;
}

export interface MessageSummary {
  uid: number;
  seq: number;
  flags: string[];
  size: number;
  date: string;
  subject: string;
  from_: Address | Address[];
  to: Address[];
  has_attachments: boolean;
  preview: string;
  is_read: boolean;
}

export interface Attachment {
  filename: string;
  mimetype: string;
  size: number;
  part_id: string;
}

export interface MessageDetail {
  uid: number;
  seq: number;
  flags: string[];
  date: string;
  subject: string;
  from_: Address | Address[];
  to: Address[];
  cc: Address[];
  bcc: Address[];
  reply_to: Address[];
  in_reply_to: string;
  message_id: string;
  references: string[];
  text_plain: string;
  text_html: string;
  attachments: Attachment[];
  inline_images: Attachment[];
  size: number;
  priority: number;
}

export interface MessagesResponse {
  messages: MessageSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── API 调用 ──

export async function fetchFolders(): Promise<Folder[]> {
  const res = await api.get('/mail/folders');
  return res.data;
}

export async function fetchMessages(
  folder: string = 'INBOX',
  page: number = 1,
  pageSize: number = 50,
  sortField: string = 'date',
  sortOrder: string = 'DESC'
): Promise<MessagesResponse> {
  const res = await api.get('/mail/messages', {
    params: { folder, page, page_size: pageSize, sort_field: sortField, sort_order: sortOrder },
  });
  return res.data;
}

export interface SearchFilters {
  query: string;
  date_from?: string;
  date_to?: string;
  unread_only?: boolean;
}

export async function searchMessages(
  query: string,
  folder: string = 'INBOX',
  page: number = 1,
  pageSize: number = 50,
  filters?: { date_from?: string; date_to?: string; unread_only?: boolean }
): Promise<MessagesResponse> {
  const res = await api.get('/mail/messages/search', {
    params: { query, folder, page, page_size: pageSize, ...filters },
  });
  return res.data;
}

export async function fetchMessageDetail(folder: string, uid: number): Promise<MessageDetail> {
  const res = await api.get(`/mail/messages/${uid}`, { params: { folder } });
  return res.data;
}

export async function markRead(folder: string, uid: number): Promise<void> {
  await api.post(`/mail/messages/${uid}/read`, null, { params: { folder } });
}

export async function markUnread(folder: string, uid: number): Promise<void> {
  await api.post(`/mail/messages/${uid}/unread`, null, { params: { folder } });
}

export async function moveMessage(folder: string, uid: number, target: string): Promise<void> {
  await api.post(`/mail/messages/${uid}/move`, null, { params: { folder, target } });
}

export async function deleteMessage(folder: string, uid: number): Promise<void> {
  await api.post(`/mail/messages/${uid}/delete`, null, { params: { folder } });
}

export async function createFolder(name: string): Promise<void> {
  await api.post('/mail/folders', null, { params: { name } });
}

export async function deleteFolder(name: string): Promise<void> {
  await api.delete('/mail/folders', { params: { name } });
}

export function getAttachmentUrl(folder: string, uid: number, partId: string): string {
  return `/api/mail/messages/${uid}/attachment/${partId}?folder=${encodeURIComponent(folder)}`;
}

export interface ImapStatus {
  connected: boolean;
  last_sync: string | null;
  host: string;
}

export async function fetchImapStatus(): Promise<ImapStatus> {
  const res = await api.get('/mail/status');
  return res.data;
}
