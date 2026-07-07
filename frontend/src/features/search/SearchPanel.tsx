/**
 * SearchPanel — 统一搜索面板 (弹窗)
 *
 * 跨邮件 + 笔记库的全局搜索.
 */

import { useState, useEffect, useRef } from 'react';
import { unifiedSearch, type UnifiedSearchItem } from '@/api/search';

interface SearchPanelProps {
  query: string;
  onClose: () => void;
  onSelectItem?: (item: UnifiedSearchItem) => void;
}

export default function SearchPanel({ query, onClose, onSelectItem }: SearchPanelProps) {
  const [results, setResults] = useState<UnifiedSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const currentReqId = ++reqIdRef.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      unifiedSearch({ q: query.trim(), limit: 20 })
        .then((res) => {
          if (currentReqId === reqIdRef.current) {
            setResults(res.results || []);
          }
        })
        .catch(() => {
          if (currentReqId === reqIdRef.current) {
            setError('搜索失败');
          }
        })
        .finally(() => {
          if (currentReqId === reqIdRef.current) {
            setLoading(false);
          }
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-1 mx-3 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-400 flex items-center gap-2">
        <span className="font-medium text-gray-600">全局搜索</span>
        <span>{query && `“${query}”`}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          <div className="w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mx-auto mb-1" />
          搜索中...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-4 text-center text-xs text-red-500">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && results.length === 0 && query.trim() && (
        <div className="px-3 py-8 text-center text-xs text-gray-400">
          没有找到匹配的结果
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          {results.map((item) => (
            <div
              key={`${item.type_}-${item.id}`}
              className="px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                onSelectItem?.(item);
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{item.type_ === 'note' ? '📝' : '📧'}</span>
                <span className="text-xs font-medium text-gray-800 truncate flex-1">
                  {item.title}
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {item.type_ === 'note' ? '笔记' : '邮件'}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5 pl-5">{item.snippet}</p>
              {item.tags.length > 0 && (
                <div className="flex gap-1 mt-1 pl-5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-[#066da5] bg-[#066da5]/5 px-1.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {results.length > 0 && (
        <div className="px-3 py-1.5 text-[10px] text-gray-400 text-center border-t border-gray-100">
          共 {results.length} 条结果
        </div>
      )}
    </div>
  );
}
