
import { useMailStore } from '@/stores/mail';
import { getAttachmentUrl } from '@/api/mail';

interface PreviewPaneProps {
  className?: string;
}

function formatAddresses(addresses: { name: string; email: string }[]): string {
  if (!addresses || addresses.length === 0) return '';
  return addresses.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)).join(', ');
}

function quoteBody(text: string): string {
  return text
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');
}

export default function PreviewPane({ className = '' }: PreviewPaneProps) {
  const previewMessage = useMailStore((s) => s.previewMessage);
  const loading = useMailStore((s) => s.loading);
  const currentFolder = useMailStore((s) => s.currentFolder);
  const setActiveView = useMailStore((s) => s.setActiveView);
  const setComposePrefill = useMailStore((s) => s.setComposePrefill);

  if (!previewMessage && !loading) {
    return (
      <div className={`${className} flex items-center justify-center text-gray-400 bg-gray-50`}>
        <div className="text-center animate-in fade-in duration-300">
          <div className="text-4xl mb-2">📧</div>
          <p className="text-sm text-gray-400">选择一封邮件进行预览</p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton for preview ──
  if (loading && !previewMessage) {
    return (
      <div className={`${className} flex flex-col bg-white border-l border-gray-200 animate-pulse`}>
        <div className="px-4 py-3 border-b border-gray-200 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-3/5" />
            <div className="flex gap-1">
              <div className="h-6 bg-gray-200 rounded w-14" />
              <div className="h-6 bg-gray-200 rounded w-14" />
              <div className="h-6 bg-gray-200 rounded w-14" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
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

  const replyTo = Array.isArray(msg.reply_to) && msg.reply_to.length > 0
    ? msg.reply_to
    : (Array.isArray(msg.from_) ? msg.from_ : [msg.from_]);

  const handleAction = (mode: 'reply' | 'reply_all' | 'forward') => {
    const subject = mode === 'forward'
      ? `Fwd: ${msg.subject}`
      : msg.subject.startsWith('Re:')
        ? msg.subject
        : `Re: ${msg.subject}`;

    const body = mode === 'forward'
      ? `\n\n--- 转发邮件 ---\n发件人: ${fromAddr}\n日期: ${new Date(msg.date).toLocaleString('zh-CN')}\n主题: ${msg.subject}\n\n${msg.text_plain || msg.text_html?.replace(/<[^>]+>/g, '') || ''}`
      : `\n\n${quoteBody(msg.text_plain || msg.text_html?.replace(/<[^>]+>/g, '') || '')}`;

    if (mode === 'forward') {
      setComposePrefill({
        mode: 'forward',
        to: '',
        subject,
        body,
        in_reply_to: msg.message_id || undefined,
      });
    } else {
      const toAddrs = replyTo.map((a: { email: string; name?: string }) => a.email).join(', ');
      const ccAddrs = mode === 'reply_all'
        ? msg.cc.filter((a) => a.email).map((a) => a.email).join(', ')
        : undefined;
      setComposePrefill({
        mode,
        to: toAddrs,
        cc: ccAddrs,
        subject,
        body,
        in_reply_to: msg.message_id || undefined,
      });
    }
    setActiveView('compose');
  };

  return (
    <div className={`${className} flex flex-col bg-white border-l border-gray-200 min-w-0`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900 truncate flex-1 min-w-0">
            {msg.subject || '(无主题)'}
          </h2>
          {/* Action buttons */}
          <div className="flex gap-1 ml-3 flex-shrink-0">
            <button
              onClick={() => handleAction('reply')}
              className="px-2.5 py-1 text-xs text-white bg-[#066da5] rounded hover:bg-[#05588a]"
              title="回复"
            >↩ 回复</button>
            <button
              onClick={() => handleAction('reply_all')}
              className="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              title="全部回复"
            >↪ 全部回复</button>
            <button
              onClick={() => handleAction('forward')}
              className="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              title="转发"
            >↗ 转发</button>
          </div>
        </div>

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
              <a
                key={i}
                href={getAttachmentUrl(currentFolder, msg.uid, att.part_id)}
                download={att.filename}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] text-gray-600 hover:border-[#066da5] hover:text-[#066da5] cursor-pointer"
              >
                📄 {att.filename}
                <span className="text-gray-400">
                  ({att.size > 1024 * 1024
                    ? `${(att.size / (1024 * 1024)).toFixed(1)}MB`
                    : `${(att.size / 1024).toFixed(0)}KB`})
                </span>
              </a>
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
            sandbox=""
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
