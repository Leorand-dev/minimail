import { useState, useEffect } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchAttachments, getAttachmentUrl } from '@/api/mail';
import type { AttachmentInfo } from '@/api/mail';

export default function AttachmentManager() {
  const currentFolder = useMailStore((s) => s.currentFolder);

  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiAvailable(true);
    fetchAttachments(currentFolder)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setAttachments(data);
        } else {
          // API returned empty or unavailable — show placeholder
          setApiAvailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setApiAvailable(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentFolder]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
          加载附件列表...
        </div>
      </div>
    );
  }

  if (!apiAvailable) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">📎</div>
          <p className="text-gray-500 font-medium mb-1">附件管理</p>
          <p className="text-xs text-gray-400 mb-4">
            附件管理功能需要连接到邮件服务器后可用。
            <br />
            当前环境暂未支持此 API。
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setApiAvailable(true);
              fetchAttachments(currentFolder)
                .then((data) => {
                  if (Array.isArray(data) && data.length > 0) {
                    setAttachments(data);
                    setApiAvailable(true);
                  } else {
                    setApiAvailable(false);
                  }
                })
                .catch(() => setApiAvailable(false))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-1.5 text-[#066da5] text-xs border border-[#066da5] rounded hover:bg-blue-50 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          📎 附件管理
        </h3>
        <span className="text-xs text-gray-400">
          {attachments.length} 个附件
        </span>
      </div>

      {/* Attachment list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {attachments.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-gray-500">当前文件夹没有附件</p>
            </div>
          </div>
        )}

        {attachments.map((att, i) => (
          <div
            key={`${att.uid}-${att.part_id}-${i}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center text-base shrink-0">
              📄
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {att.filename}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatSize(att.size)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span className="truncate max-w-[120px]">{att.from}</span>
                <span className="shrink-0">·</span>
                <span className="truncate max-w-[160px]">{att.subject}</span>
                <span className="shrink-0">·</span>
                <span className="shrink-0">
                  {att.date
                    ? new Date(att.date).toLocaleDateString()
                    : ''}
                </span>
              </div>
            </div>

            {/* Download link */}
            <a
              href={getAttachmentUrl(currentFolder, att.uid, att.part_id)}
              download={att.filename}
              className="px-2 py-1 text-xs text-[#066da5] hover:bg-blue-50 rounded transition-colors shrink-0"
              title="下载附件"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
