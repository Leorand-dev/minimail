import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMailStore } from '@/stores/mail';
import api from '@/api/client';
import AutocompleteInput from './AutocompleteInput';
import RichTextEditor from './RichTextEditor';
import { fetchAccounts } from '@/api/accounts';
import type { EmailAccount } from '@/api/accounts';

interface ComposePageProps {
  onBack?: () => void;
}

export default function ComposePage({ onBack }: ComposePageProps) {
  const navigate = useNavigate();
  const toRef = useRef<HTMLInputElement>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Listen for compose-send event from parent header
  const handleSendRef = useRef<() => void>(() => {});
  useEffect(() => {
    const handler = () => handleSendRef.current();
    window.addEventListener('compose-send', handler);
    return () => window.removeEventListener('compose-send', handler);
  }, []);

  // Clean up pending timer on unmount
  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, []);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const composePrefill = useMailStore((s) => s.composePrefill);
  const setComposePrefill = useMailStore((s) => s.setComposePrefill);

  useEffect(() => {
    if (composePrefill) {
      setTo(composePrefill.to);
      setCc(composePrefill.cc || '');
      setBcc('');
      setSubject(composePrefill.subject);
      setBody(composePrefill.body);
      if (composePrefill.from_addr) setFrom(composePrefill.from_addr);
      // 回复/转发模式需要设置 from_addr
      // 清空预填充避免重复
      setComposePrefill(null);
    }
  }, [composePrefill, setComposePrefill]);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!to.trim()) {
      setError('请输入收件人');
      toRef.current?.focus();
      return;
    }

    const toList = to.split(',').map((s) => s.trim()).filter(Boolean);
    const ccList = cc.split(',').map((s) => s.trim()).filter(Boolean);
    const bccList = bcc.split(',').map((s) => s.trim()).filter(Boolean);

    const allAddrs = [...toList, ...ccList, ...bccList];
    const invalid = allAddrs.filter((a) => !EMAIL_RE.test(a));
    if (invalid.length > 0) {
      setError(`以下邮箱格式不正确: ${invalid.join(', ')}`);
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, unknown> = {
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject,
        text_body: body || htmlBody.replace(/<[^>]*>/g, '').trim() || ' ',
        html_body: htmlBody || undefined,
      };
      if (from.trim()) payload.from_addr = from.trim();
      if (selectedAccountId) payload.account_id = selectedAccountId;

      await api.post('/mail/send', payload);

      setSuccess(`✅ 发送成功`);
      sendTimerRef.current = setTimeout(() => onBack ? onBack() : navigate('/mail'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(axiosErr?.response?.data?.detail || axiosErr?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  // Sync ref with latest handleSend
  handleSendRef.current = handleSend;

  return (
    <div className="bg-white flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[55px] border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack ? onBack() : navigate('/mail')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← 取消
          </button>
          <h1 className="text-base font-semibold text-gray-700">写邮件</h1>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-5 py-1.5 bg-[#066da5] text-white text-sm font-medium rounded hover:bg-[#05588a] disabled:opacity-50 transition-colors"
        >
          {sending ? '发送中...' : '发送'}
        </button>
      </div>

      {/* Alert */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* Form fields */}
      <div className="flex-1">
        {/* 发件人 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
          <span className="text-xs text-gray-400 w-12 shrink-0">发件人</span>
          <select
            value={selectedAccountId || ''}
            onChange={(e) => {
              const acc = accounts.find(a => a.id === e.target.value);
              if (acc) {
                setSelectedAccountId(acc.id);
                setFrom(`${acc.name || acc.email} <${acc.email}>`);
              }
            }}
            className="flex-1 text-sm border-0 outline-none bg-transparent text-gray-700"
          >
            {accounts.length === 0 && <option value="">{from || '默认账户'}</option>}
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name || acc.email} — {acc.email}
              </option>
            ))}
          </select>
        </div>

        {/* 收件人 with autocomplete */}
        <AutocompleteInput
          value={to}
          onChange={setTo}
          label="收件人"
          placeholder="user@example.com (多个地址用逗号分隔)"
          inputRef={toRef}
        />

        {/* 抄送 with autocomplete */}
        <AutocompleteInput
          value={cc}
          onChange={setCc}
          label="抄送"
          placeholder="抄送地址"
        />

        {/* 密送 with autocomplete */}
        <AutocompleteInput
          value={bcc}
          onChange={setBcc}
          label="密送"
          placeholder="密送地址"
        />

        {/* 主题 */}
        <div className="flex items-center border-b border-gray-200">
          <label className="w-16 flex-shrink-0 px-3 text-xs font-medium text-gray-500">主题</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="邮件主题"
            className="flex-1 px-2 py-2.5 text-sm border-0 outline-none"
          />
        </div>

        {/* 正文 */}
        <RichTextEditor
          value={htmlBody}
          onChange={(html, text) => { setHtmlBody(html); setBody(text); }}
          placeholder="在此输入邮件内容..."
        />
      </div>
    </div>
  );
}