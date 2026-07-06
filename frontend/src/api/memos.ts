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
  pinned: boolean;
  parent_id: string | null;
  row_status: 'active' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
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
