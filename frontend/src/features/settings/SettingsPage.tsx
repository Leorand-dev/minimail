import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMailSettings, testMailConnection, updateMailSettings, autoDetectMailSettings } from '@/api/settings';
import { fetchAccounts, createAccount, deleteAccount, setDefaultAccount } from '@/api/accounts';
import type { EmailAccount } from '@/api/accounts';

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
  const [wizardEmail, setWizardEmail] = useState('');
  const [wizardResult, setWizardResult] = useState<{ imap: { host: string; port: number }; smtp: { host: string; port: number } } | null>(null);

  // 多账户
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetchMailSettings()
      .then((data) => { setImap(data.imap); setSmtp(data.smtp); })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status !== 401) console.warn('加载设置失败:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  const handleAddAccount = async () => {
    const email = prompt('邮箱地址:');
    if (!email || !email.includes('@')) return;
    try {
      const acc = await createAccount({ email, name: email.split('@')[0] });
      setAccounts(prev => [...prev, acc]);
      setSuccess(`✅ 已添加账户: ${email}`);
    } catch { setError('添加账户失败'); }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`确定删除账户"${name}"？`)) return;
    try {
      await deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      setSuccess(`✅ 已删除账户: ${name}`);
    } catch { setError('删除账户失败'); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAccount(id);
      setAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
      setSuccess('✅ 默认账户已更新');
    } catch { setError('设置默认账户失败'); }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try { await updateMailSettings(imap, smtp); setSuccess('设置已保存'); }
    catch { setError('保存失败'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setError(''); setSuccess('');
    try {
      const res = await testMailConnection();
      if (res.status === 'ok') setSuccess('✅ 连接测试通过！');
      else setError(`❌ 连接测试失败: ${(res.errors || ['未知错误']).join('; ')}`);
    } catch { setError('连接测试请求失败'); }
    finally { setTesting(false); }
  };

  const handleAutoDetect = async () => {
    if (!wizardEmail.includes('@')) return;
    try {
      const result = await autoDetectMailSettings(wizardEmail);
      setWizardResult(result);
    } catch {
      setError('自动检测失败，请检查邮箱地址');
    }
  };

  const applyWizardSettings = (result: { imap: { host: string; port: number }; smtp: { host: string; port: number } }) => {
    setImap(prev => ({ ...prev, host: result.imap.host, port: result.imap.port }));
    setSmtp(prev => ({ ...prev, host: result.smtp.host, port: result.smtp.port }));
    setWizardResult(null);
    setWizardEmail('');
    setSuccess('✅ 已应用自动检测的设置，请检查并保存');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mr-2" />加载中...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">

          {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}
          {success && <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">{success}</div>}

          {/* 📧 邮箱账户管理 */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-700">📧 邮箱账户 ({accounts.length})</h2>
              <button onClick={handleAddAccount} className="px-3 py-1 text-xs text-white bg-[#066da5] rounded hover:bg-[#05588a]">+ 添加账户</button>
            </div>
            {loadingAccounts ? (
              <div className="text-sm text-gray-400">加载中...</div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">暂无账户，点击上方的"+ 添加账户"来添加</div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${acc.configured ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className="font-medium text-gray-700 truncate">{acc.name}</span>
                      <span className="text-gray-400 truncate">{acc.email}</span>
                      {acc.is_default && <span className="px-1.5 py-0.5 text-[10px] bg-[#066da5] text-white rounded">默认</span>}
                      {!acc.configured && <span className="text-xs text-gray-400">(未配置)</span>}
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      {!acc.is_default && (
                        <button onClick={() => handleSetDefault(acc.id)} className="px-2 py-0.5 text-xs text-[#066da5] hover:bg-blue-50 rounded">设为默认</button>
                      )}
                      <button onClick={() => handleDeleteAccount(acc.id, acc.name)} className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* IMAP Settings */}
          <section className="mb-8">
            <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">📥 IMAP 收件设置</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
                <input type="text" value={imap.host} onChange={(e) => setImap({ ...imap, host: e.target.value })} placeholder="imap.example.com" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">端口</label>
                <input type="number" value={imap.port} onChange={(e) => setImap({ ...imap, port: parseInt(e.target.value) || 993 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={imap.ssl} onChange={(e) => setImap({ ...imap, ssl: e.target.checked })} className="accent-[#066da5]" />
                  <span className="text-sm text-gray-600">使用 SSL/TLS</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
                <input type="text" value={imap.username} onChange={(e) => setImap({ ...imap, username: e.target.value })} placeholder="your@email.com" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
                <input type="password" value={imap.password} onChange={(e) => setImap({ ...imap, password: e.target.value })} placeholder="••••••••" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
            </div>
          </section>

          {/* SMTP Settings */}
          <section className="mb-8">
            <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">📤 SMTP 发件设置</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
                <input type="text" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">端口</label>
                <input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 465 })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={smtp.ssl} onChange={(e) => setSmtp({ ...smtp, ssl: e.target.checked })} className="accent-[#066da5]" />
                  <span className="text-sm text-gray-600">使用 SSL/TLS</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
                <input type="text" value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} placeholder="your@email.com" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
                <input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} placeholder="••••••••" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
            </div>
          </section>

          {/* 📧 邮箱设置向导 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
            <h4 className="font-medium text-sm mb-3">📧 邮箱设置向导</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={wizardEmail}
                onChange={(e) => setWizardEmail(e.target.value)}
                placeholder="输入邮箱地址"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md"
              />
              <button onClick={handleAutoDetect} className="px-4 py-1.5 text-sm bg-[#066da5] text-white rounded-md hover:bg-[#05588a]">
                自动检测
              </button>
            </div>
            {wizardResult && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-sm space-y-1">
                <div className="text-green-600 font-medium">✅ 检测到配置</div>
                <div>IMAP: {wizardResult.imap.host}:{wizardResult.imap.port}</div>
                <div>SMTP: {wizardResult.smtp.host}:{wizardResult.smtp.port}</div>
                <button onClick={() => applyWizardSettings(wizardResult)} className="mt-2 px-3 py-1 text-xs bg-[#066da5] text-white rounded">
                  应用到设置
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#066da5] text-white text-sm font-medium rounded hover:bg-[#05588a] disabled:opacity-50 transition-colors">
              {saving ? '保存中...' : '保存设置'}
            </button>
            <button onClick={handleTest} disabled={testing} className="px-6 py-2 bg-white text-[#066da5] text-sm font-medium border border-[#066da5] rounded hover:bg-blue-50 disabled:opacity-50 transition-colors">
              {testing ? '测试中...' : '🔌 测试连接'}
            </button>
            <button onClick={() => onBack ? onBack() : navigate('/mail')} className="px-6 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50">取消</button>
          </div>

        </div>
      </div>
    </div>
  );
}
