import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth(res.user, res.access_token, res.refresh_token);
      navigate('/mail');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail?: string } } }).response?.data?.detail
          : '登录失败，请重试';
      setError(msg || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-[#066da5] text-3xl font-bold text-white">
            M
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Webmail</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#066da5] focus:ring-1 focus:ring-[#066da5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#066da5] focus:ring-1 focus:ring-[#066da5]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#066da5] px-4 py-2 text-sm font-medium text-white hover:bg-[#05588a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          没有账号？{' '}
          <Link to="/register" className="text-[#066da5] hover:underline">
            注册
          </Link>
        </p>

        <div className="mt-4 text-center text-xs text-gray-400">
          &copy; 2026 Webmail
        </div>
      </div>
    </div>
  );
}
