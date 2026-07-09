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
  query?: string;
  date_from?: string;
  date_to?: string;
  unread_only?: boolean;
}

export async function searchMessages(
  query: string,
  folder: string = 'INBOX',
  page: number = 1,
  pageSize: number = 50,
  filters?: SearchFilters
): Promise<MessagesResponse> {
  const res = await api.get('/mail/messages/search', {
    params: { query, folder, page, page_size: pageSize, ...filters },
  });
  return res.data;
}

/** 文件夹名中文映射 */
export function folderDisplayName(name: string): string {
  const map: Record<string, string> = {
    'INBOX': '收件箱',
    'Sent': '已发送',
    'Drafts': '草稿箱',
    'Junk': '垃圾邮件',
    'Spam': '垃圾邮件',
    'Trash': '已删除',
    'Archive': '归档',
    'Outbox': '发件箱',
    'Important': '重要',
  };
  return map[name] || name;
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

export interface AccountFolderGroup {
  account_id: string;
  account_email: string;
  account_name: string;
  folders: Folder[];
}

export async function fetchAccountFolders(accountId: string): Promise<AccountFolderGroup> {
  const res = await api.get(`/mail/account-folders/${accountId}`);
  return res.data;
}

// ── 批量操作 ──

export async function batchMarkRead(folder: string, uids: number[]): Promise<void> {
  await api.post('/mail/batch/mark-read', { folder, uids });
}

export async function batchMarkUnread(folder: string, uids: number[]): Promise<void> {
  await api.post('/mail/batch/mark-unread', { folder, uids });
}

export async function batchDeleteMessages(folder: string, uids: number[]): Promise<void> {
  await api.post('/mail/batch/delete', { folder, uids });
}

export async function batchMove(folder: string, targetFolder: string, uids: number[]): Promise<void> {
  await api.post('/mail/batch/move', { uids, from_folder: folder, to_folder: targetFolder });
}

/** @deprecated Use batchMove instead */
export async function batchArchive(folder: string, uids: number[]): Promise<void> {
  await batchMove(folder, 'Archive', uids);
}

// ── 会话视图 ──

export interface ConversationMessage {
  uid: number;
  subject: string;
  from: string;
  date: string;
  preview: string;
  has_attachments: boolean;
  is_read: boolean;
}

export interface Conversation {
  subject: string;
  message_count: number;
  latest_date: string;
  messages: ConversationMessage[];
}

export async function fetchConversations(params: {
  folder?: string;
  account_id?: string;
  page_size?: number;
}): Promise<{ conversations: Conversation[]; total: number }> {
  const res = await api.get('/mail/conversations', { params });
  return res.data;
}

// ── 附件管理 ──

export interface AttachmentInfo {
  filename: string;
  size: number;
  uid: number;
  part_id: string;
  subject: string;
  from: string;
  date: string;
}

export async function fetchAttachments(folder?: string): Promise<AttachmentInfo[]> {
  try {
    const res = await api.get('/mail/attachments', { params: { folder } });
    return res.data.attachments ?? res.data;
  } catch {
    return [];
  }
}
