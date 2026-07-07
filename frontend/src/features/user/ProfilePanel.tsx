import { useEffect, useState } from 'react';
import { fetchProfile, updateProfile, changePassword } from '@/api/user';

export default function ProfilePanel() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Password change
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((u) => { setName(u.name || ''); setUsername(u.username || ''); setEmail(u.email); })
      .catch(() => setError('加载用户信息失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateProfile(name, username);
      setSuccess('个人信息已更新');
    } catch { setError('保存失败'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) { setError('请填写当前密码和新密码'); return; }
    if (newPwd.length < 8) { setError('新密码至少8个字符'); return; }
    setChangingPwd(true); setError(''); setSuccess('');
    try {
      await changePassword(currentPwd, newPwd);
      setSuccess('密码已修改');
      setCurrentPwd(''); setNewPwd(''); setShowPwd(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || '密码修改失败');
    }
    finally { setChangingPwd(false); }
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
        <div className="space-y-8">

          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}
          {success && <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">{success}</div>}

          {/* 基本信息 */}
          <section className="mb-8">
            <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">👤 基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">邮箱</label>
                <input type="text" value={email} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="你的用户名"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">显示名称</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="你的显示名称"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-[#066da5] text-white text-sm rounded hover:bg-[#05588a] disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </section>

          {/* 修改密码 */}
          <section className="mb-8">
            <h2 className="text-base font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">🔒 修改密码</h2>
            {!showPwd ? (
              <button onClick={() => setShowPwd(true)}
                className="px-4 py-2 bg-white text-[#066da5] text-sm border border-[#066da5] rounded hover:bg-blue-50">
                修改密码
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">当前密码</label>
                  <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">新密码</label>
                  <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="至少8位，包含大小写字母和数字"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleChangePassword} disabled={changingPwd}
                    className="px-4 py-2 bg-[#066da5] text-white text-sm rounded hover:bg-[#05588a] disabled:opacity-50">
                    {changingPwd ? '修改中...' : '确认修改'}
                  </button>
                  <button onClick={() => { setShowPwd(false); setCurrentPwd(''); setNewPwd(''); }}
                    className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50">取消</button>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
