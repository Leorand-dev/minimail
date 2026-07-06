import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'checking' | 'ready' | 'done'>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/auth/setup/status')
      .then((res) => {
        if (res.data.needs_setup) setStep('ready');
        else navigate('/login');
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  const handleSetup = async () => {
    setError('');
    if (!username.trim()) { setError('请输入管理员用户名'); return; }
    if (!password) { setError('请输入密码'); return; }
    if (password.length < 8) { setError('密码至少8个字符'); return; }
    if (password !== confirmPassword) { setError('两次密码不一致'); return; }

    setLoading(true);
    try {
      await api.post('/api/auth/setup', {
        email: `${username}@minimail.local`,
        password,
        name: username,
      });
      setStep('done');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || '设置失败');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#066da5] flex items-center justify-center text-white font-bold text-xl mb-3">M</div>
          <h1 className="text-xl font-semibold text-gray-800">初始化 Minimail</h1>
          <p className="text-sm text-gray-400 mt-1">首次部署，请设置管理员账号</p>
        </div>

        {step === 'done' ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-600 font-medium">管理员设置成功！</p>
            <p className="text-sm text-gray-400 mt-1">即将跳转到登录页...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">管理员用户名</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="至少8位，包含大小写字母和数字"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">确认密码</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none" />
            </div>

            <button onClick={handleSetup} disabled={loading}
              className="w-full py-2 bg-[#066da5] text-white text-sm font-medium rounded hover:bg-[#05588a] disabled:opacity-50 transition-colors">
              {loading ? '设置中...' : '初始化系统'}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">&copy; 2026 Minimail</p>
      </div>
    </div>
  );
}
