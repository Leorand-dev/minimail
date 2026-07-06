import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMailSettings, testMailConnection, updateMailSettings } from '@/api/settings';

interface SettingsPageProps {
  onBack?: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const navigate = useNavigate();

  const [imap, setImap] = useState({ host: '', port: 993, ssl: true, username: '', password: '' });
  const [smtp, setSmtp] = useState({ host: '', port: 465, ssl: true, username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMailSettings()
      .then((data) => {
        setImap(data.imap);
        setSmtp(data.smtp);
      })
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.warn('加载设置失败:', err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateMailSettings(imap, smtp);
      setSuccess('设置已保存');
    } catch {
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      const res = await testMailConnection();
      if (res.status === 'ok') {
        setSuccess('✅ 连接测试通过！');
      } else {
        const msgs = (res.errors || ['未知错误']).join('; ');
        setError(`❌ 连接测试失败: ${msgs}`);
      }
    } catch {
      setError('连接测试请求失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back */}
      <button
        onClick={() => onBack ? onBack() : navigate('/mail')}
        className="text-sm text-[#066da5] hover:underline mb-4"
      >
        ← 返回邮箱
      </button>

      <h1 className="text-xl font-semibold text-gray-800 mb-6">邮件账户设置</h1>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* IMAP Settings */}
      <section className="mb-8">
        <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">
          📥 IMAP 收件设置
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
            <input
              type="text"
              value={imap.host}
              onChange={(e) => setImap({ ...imap, host: e.target.value })}
              placeholder="imap.example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">端口</label>
            <input
              type="number"
              value={imap.port}
              onChange={(e) => setImap({ ...imap, port: parseInt(e.target.value) || 993 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={imap.ssl}
                onChange={(e) => setImap({ ...imap, ssl: e.target.checked })}
                className="accent-[#066da5]"
              />
              <span className="text-sm text-gray-600">使用 SSL/TLS</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
            <input
              type="text"
              value={imap.username}
              onChange={(e) => setImap({ ...imap, username: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
            <input
              type="password"
              value={imap.password}
              onChange={(e) => setImap({ ...imap, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* SMTP Settings */}
      <section className="mb-8">
        <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">
          📤 SMTP 发件设置
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
            <input
              type="text"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              placeholder="smtp.example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">端口</label>
            <input
              type="number"
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 465 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={smtp.ssl}
                onChange={(e) => setSmtp({ ...smtp, ssl: e.target.checked })}
                className="accent-[#066da5]"
              />
              <span className="text-sm text-gray-600">使用 SSL/TLS</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
            <input
              type="text"
              value={smtp.username}
              onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
            <input
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[#066da5] text-white text-sm font-medium rounded hover:bg-[#05588a] disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-6 py-2 bg-white text-[#066da5] text-sm font-medium border border-[#066da5] rounded hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          {testing ? '测试中...' : '🔌 测试连接'}
        </button>
        <button
          onClick={() => onBack ? onBack() : navigate('/mail')}
          className="px-6 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
