import { useState, useEffect } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchConversations } from '@/api/mail';
import type { Conversation } from '@/api/mail';

interface ConversationListProps {
  onSelectMessage: (uid: number) => void;
}

export default function ConversationList({ onSelectMessage }: ConversationListProps) {
  const currentFolder = useMailStore((s) => s.currentFolder);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchConversations({ folder: currentFolder, page_size: 50 })
      .then((data) => setConvs(data.conversations))
      .catch(() => setError('加载会话失败'))
      .finally(() => setLoading(false));
  }, [currentFolder]);

  const toggleExpand = (subject: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
          加载会话中...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-500 font-medium mb-1">连接失败</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError('');
              fetchConversations({ folder: currentFolder, page_size: 50 })
                .then((data) => setConvs(data.conversations))
                .catch(() => setError('加载会话失败'))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-1.5 text-[#066da5] text-xs border border-[#066da5] rounded hover:bg-blue-50 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );

  if (convs.length === 0)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-gray-500 font-medium mb-1">暂无会话</p>
          <p className="text-xs text-gray-400">同一主题的邮件将自动聚合为会话</p>
        </div>
      </div>
    );

  return (
    <div className="min-w-0 flex flex-col flex-1 overflow-y-auto divide-y divide-gray-100">
      {convs.map((conv) => (
        <div key={conv.subject} className="hover:bg-gray-50 transition-colors">
          <button
            onClick={() => toggleExpand(conv.subject)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 shrink-0">
                  {expanded.has(conv.subject) ? '▼' : '▶'}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {conv.subject}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                  {conv.message_count}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5 ml-6 truncate">
                {conv.messages[0]?.from ?? ''}
                {conv.messages[0]?.preview ? ` — ${conv.messages[0].preview.slice(0, 60)}` : ''}
              </div>
            </div>
            <span className="text-xs text-gray-400 ml-2 shrink-0">
              {conv.latest_date
                ? new Date(conv.latest_date).toLocaleDateString()
                : ''}
            </span>
          </button>

          {expanded.has(conv.subject) && (
            <div className="border-t border-gray-50">
              {conv.messages.map((msg) => (
                <button
                  key={msg.uid}
                  onClick={() => onSelectMessage(msg.uid)}
                  className={`w-full flex items-center gap-3 px-8 py-2 text-left hover:bg-gray-50 transition-colors ${
                    !msg.is_read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      !msg.is_read ? 'bg-[#066da5]' : 'bg-transparent'
                    }`}
                  />
                  <span
                    className={`text-xs truncate flex-1 ${
                      !msg.is_read
                        ? 'font-medium text-gray-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {msg.from}
                    {msg.preview ? ` — ${msg.preview.slice(0, 50)}` : ''}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {msg.date
                      ? new Date(msg.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
