import React from 'react';
import { useMailStore } from '@/stores/mail';

interface PreviewPaneProps {
  className?: string;
}

function formatAddresses(addresses: { name: string; email: string }[]): string {
  if (!addresses || addresses.length === 0) return '';
  return addresses.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
}

export default function PreviewPane({ className = '' }: PreviewPaneProps) {
  const previewMessage = useMailStore((s) => s.previewMessage);
  const loading = useMailStore((s) => s.loading);

  if (!previewMessage && !loading) {
    return (
      <div className={`${className} flex items-center justify-center text-gray-400 bg-gray-50`}>
        <div className="text-center">
          <div className="text-3xl mb-2">📧</div>
          <p className="text-sm">选择一封邮件进行预览</p>
        </div>
      </div>
    );
  }

  if (loading && !previewMessage) {
    return (
      <div className={`${className} flex items-center justify-center text-gray-400`}>
        <div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (!previewMessage) return null;

  const msg = previewMessage;
  const fromAddr = Array.isArray(msg.from_)
    ? formatAddresses(msg.from_)
    : msg.from_.name
    ? `${msg.from_.name} <${msg.from_.email}>`
    : msg.from_.email;

  return (
    <div className={`${className} flex flex-col bg-white border-l border-gray-200 min-w-0`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900 mb-2 truncate">
          {msg.subject || '(无主题)'}
        </h2>

        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex">
            <span className="w-12 flex-shrink-0 text-gray-400">发件人</span>
            <span className="text-gray-700 truncate">{fromAddr}</span>
          </div>
          {msg.to.length > 0 && (
            <div className="flex">
              <span className="w-12 flex-shrink-0 text-gray-400">收件人</span>
              <span className="truncate">{formatAddresses(msg.to)}</span>
            </div>
          )}
          {msg.cc.length > 0 && (
            <div className="flex">
              <span className="w-12 flex-shrink-0 text-gray-400">抄送</span>
              <span className="truncate">{formatAddresses(msg.cc)}</span>
            </div>
          )}
          <div className="flex">
            <span className="w-12 flex-shrink-0 text-gray-400">日期</span>
            <span>{new Date(msg.date).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* Attachments bar */}
      {msg.attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-1">
            📎 {msg.attachments.length} 个附件
          </p>
          <div className="flex flex-wrap gap-1">
            {msg.attachments.map((att, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] text-gray-600"
              >
                📄 {att.filename}
                <span className="text-gray-400">
                  ({att.size > 1024 * 1024
                    ? `${(att.size / (1024 * 1024)).toFixed(1)}MB`
                    : `${(att.size / 1024).toFixed(0)}KB`})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4">
        {msg.text_html ? (
          <iframe
            srcDoc={msg.text_html}
            className="w-full h-full border-0"
            title="邮件正文"
            sandbox="allow-same-origin"
          />
        ) : msg.text_plain ? (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
            {msg.text_plain}
          </pre>
        ) : (
          <div className="text-gray-400 text-sm">无内容</div>
        )}
      </div>

      {/* Inline images */}
      {msg.inline_images.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400">
            {msg.inline_images.length} 张内联图片
          </p>
        </div>
      )}
    </div>
  );
}
