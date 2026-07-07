/**
 * Minimail — 搜索 API
 *
 * 统一搜索: 跨邮件 + 笔记库
 */

import api from '@/api/client';

export interface UnifiedSearchItem {
  id: string;
  type_: 'mail' | 'note';
  title: string;
  snippet: string;
  date: string;
  folder?: string;
  tags: string[];
  score: number;
  uid?: number;
}

export interface UnifiedSearchResponse {
  results: UnifiedSearchItem[];
  total: number;
  query: string;
}

/** 统一搜索 */
export async function unifiedSearch(params: {
  q: string;
  limit?: number;
}): Promise<UnifiedSearchResponse> {
  const res = await api.get('/search', { params });
  return res.data;
}
