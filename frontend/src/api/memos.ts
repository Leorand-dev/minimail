/**
 * Minimail — 笔记库 Note API 客户端
 *
 * 类型定义 + 全部 API 调用函数
 */

import api from '@/api/client';

// ── 类型定义 ──

export interface Note {
  id: string;
  user_id: string;
  content: string;
  visibility: 'private' | 'public';
  pinned?: boolean;
  parent_id?: string | null;
  row_status?: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  reactions?: NoteReaction[];
}

export interface NoteReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface NoteCreate {
  content: string;
  visibility?: 'private' | 'public';
  pinned?: boolean;
  parent_id?: string | null;
  tags?: string[];
}

export interface NoteUpdate {
  content?: string;
  visibility?: 'private' | 'public';
  pinned?: boolean;
  row_status?: 'active' | 'archived';
  tags?: string[];
}

export interface NoteListResponse {
  notes: Note[];
  next_page_token: string | null;
  total: number;
}

export interface NoteTag {
  name: string;
  note_count: number;
}

// ── API 函数 ──

/** 获取笔记列表 (游标分页) */
export async function fetchNotes(params?: {
  page_size?: number;
  cursor?: string;
  visibility?: string;
  tag?: string;
}): Promise<NoteListResponse> {
  const res = await api.get('/notes', { params });
  return res.data;
}

/** 获取单条笔记 */
export async function fetchNote(id: string): Promise<Note> {
  const res = await api.get(`/notes/${id}`);
  return res.data;
}

/** 创建笔记 */
export async function createNote(data: NoteCreate): Promise<Note> {
  const res = await api.post('/notes', data);
  return res.data;
}

/** 更新笔记 (部分更新) */
export async function updateNote(id: string, data: NoteUpdate): Promise<Note> {
  const res = await api.put(`/notes/${id}`, data);
  return res.data;
}

/** 删除笔记 (软删除) */
export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`);
}

/** 切换置顶 */
export async function togglePin(id: string): Promise<Note> {
  const res = await api.post(`/notes/${id}/pin`);
  return res.data;
}

/** 恢复归档 */
export async function restoreNote(id: string): Promise<Note> {
  const res = await api.post(`/notes/${id}/restore`);
  return res.data;
}

/** 标签列表 */
export async function fetchTags(): Promise<NoteTag[]> {
  const res = await api.get('/notes/tags');
  return res.data;
}

/** 创建标签 */
export async function createTag(name: string): Promise<NoteTag> {
  const res = await api.post('/notes/tags', { name });
  return res.data;
}

/** 重命名标签 */
export async function renameTag(oldName: string, newName: string): Promise<NoteTag> {
  const res = await api.put(`/notes/tags/${encodeURIComponent(oldName)}`, { new_name: newName });
  return res.data;
}

/** 删除标签 */
export async function deleteTag(name: string): Promise<void> {
  await api.delete(`/notes/tags/${encodeURIComponent(name)}`);
}

/** 全文搜索 */
export async function searchNotes(params: {
  q?: string;
  tag?: string;
  visibility?: string;
  page_size?: number;
  cursor?: string;
}): Promise<NoteListResponse> {
  const res = await api.get('/notes/search', { params });
  return res.data;
}

/** 语义搜索 — 传入外部 AI 计算的 embedding, 返回最相似笔记 */
export async function semanticSearch(params: {
  embedding: number[];
  query?: string;
  tag?: string;
  visibility?: string;
  top_k?: number;
}): Promise<{ results: Array<{ note: Note; score: number }> }> {
  const res = await api.post('/notes/search/semantic', params);
  return res.data;
}

/** 从上下文创建笔记 — Agent 专用 */
export async function createNoteFromContext(params: {
  content: string;
  tags?: string[];
  visibility?: string;
  source?: string;
  embedding?: number[];
}): Promise<Note> {
  const res = await api.post('/notes/from-context', params);
  return res.data;
}

/** 从邮件创建笔记 */
export async function createNoteFromEmail(params: {
  subject: string;
  sender: string;
  body: string;
  date: string;
  folder?: string;
  tags?: string[];
}): Promise<Note> {
  const res = await api.post('/notes/from-email', params);
  return res.data;
}

/** 切换笔记反应 (添加/移除 Emoji) */
export async function toggleReaction(
  noteId: string,
  emoji: string
): Promise<Note> {
  const res = await api.post(`/notes/${noteId}/reactions`, null, {
    params: { emoji },
  });
  return res.data;
}

/** 上传笔记附件 */
export async function uploadAttachment(
  noteId: string,
  file: File
): Promise<NoteAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`/notes/${noteId}/attachments`, form);
  return res.data;
}

/** 获取笔记附件列表 */
export async function fetchAttachments(
  noteId: string
): Promise<NoteAttachment[]> {
  const res = await api.get(`/notes/${noteId}/attachments`);
  return res.data;
}

/** 创建评论 */
export async function createComment(
  noteId: string,
  content: string
): Promise<Note> {
  const res = await api.post(`/notes/${noteId}/comments`, { content });
  return res.data;
}

/** 获取评论列表 */
export async function fetchComments(
  noteId: string
): Promise<Note[]> {
  const res = await api.get(`/notes/${noteId}/comments`);
  return res.data;
}

/** 获取链接元数据 */
export async function fetchLinkMetadata(
  url: string
): Promise<LinkMetadata> {
  const res = await api.post('/notes/link-metadata', { url });
  return res.data;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  filename: string;
  size: number;
  mime_type: string;
  created_at?: string;
  url: string;
}

export interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  image: string;
}

export interface NoteShare {
  id: string;
  note_id: string;
  token: string;
  expires_at?: string;
  created_at?: string;
  url: string;
}

export interface NoteShortcut {
  id: string;
  name: string;
  icon: string;
  filter_tag: string;
  filter_visibility: string;
  sort_order?: number;
}

export interface NoteWebhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at?: string;
}

export interface NoteSettings {
  note_allow_shares: boolean;
}

/** 创建分享链接 */
export async function createShareLink(noteId: string, expiresInHours?: number): Promise<NoteShare> {
  const res = await api.post(`/notes/${noteId}/shares`, { expires_in_hours: expiresInHours || 0 });
  return res.data;
}

/** 获取笔记分享链接列表 */
export async function fetchShares(noteId: string): Promise<NoteShare[]> {
  const res = await api.get(`/notes/${noteId}/shares`);
  return res.data;
}

/** 删除分享链接 */
export async function deleteShareLink(noteId: string, shareId: string): Promise<void> {
  await api.delete(`/notes/${noteId}/shares/${shareId}`);
}

/** 获取快捷键列表 */
export async function fetchShortcuts(): Promise<NoteShortcut[]> {
  const res = await api.get('/notes/shortcuts');
  return res.data;
}

/** 创建快捷键 */
export async function createShortcut(params: { name: string; icon?: string; filter_tag?: string; filter_visibility?: string }): Promise<NoteShortcut> {
  const res = await api.post('/notes/shortcuts', params);
  return res.data;
}

/** 更新快捷键 */
export async function updateShortcut(id: string, params: Partial<NoteShortcut>): Promise<NoteShortcut> {
  const res = await api.put(`/notes/shortcuts/${id}`, params);
  return res.data;
}

/** 删除快捷键 */
export async function deleteShortcut(id: string): Promise<void> {
  await api.delete(`/notes/shortcuts/${id}`);
}

/** 获取 Webhook 列表 */
export async function fetchWebhooks(): Promise<NoteWebhook[]> {
  const res = await api.get('/notes/webhooks');
  return res.data;
}

/** 创建 Webhook */
export async function createWebhook(params: { url: string; events?: string[]; secret?: string }): Promise<NoteWebhook> {
  const res = await api.post('/notes/webhooks', params);
  return res.data;
}

/** 更新 Webhook */
export async function updateWebhook(id: string, params: Partial<NoteWebhook>): Promise<NoteWebhook> {
  const res = await api.put(`/notes/webhooks/${id}`, params);
  return res.data;
}

/** 删除 Webhook */
export async function deleteWebhook(id: string): Promise<void> {
  await api.delete(`/notes/webhooks/${id}`);
}

/** 获取笔记设置 */
export async function fetchNoteSettings(): Promise<NoteSettings> {
  const res = await api.get('/settings/notes');
  return res.data;
}

/** 更新笔记设置 */
export async function updateNoteSettings(params: Partial<NoteSettings>): Promise<NoteSettings> {
  const res = await api.put('/settings/notes', params);
  return res.data;
}
