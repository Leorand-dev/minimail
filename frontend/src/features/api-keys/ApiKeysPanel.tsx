import React, { useEffect, useState } from 'react';
import { useMailStore } from '@/stores/mail';
import { fetchApiTokens, createApiToken, revokeApiToken } from '@/api/api_tokens';
import type { ApiToken, ApiTokenCreated } from '@/api/api_tokens';

export default function ApiKeysPanel() {
  const setActiveView = useMailStore((s) => s.setActiveView);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState('read');
  const [newExpiry, setNewExpiry] = useState('0');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<ApiTokenCreated | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApiTokens(false);
      setTokens(data);
    } catch {
      setError('加载令牌列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Listen for panel-new event from parent header
  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener('panel-new', handler);
    return () => window.removeEventListener('panel-new', handler);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { setError('请输入令牌名称'); return; }
    setCreating(true);
    setError('');
    try {
      const token = await createApiToken(newName.trim(), newScopes, parseInt(newExpiry) || 0);
      setCreatedToken(token);
      setShowCreate(false);
      setNewName('');
      setNewScopes('read');
      setNewExpiry('0');
      await load();
    } catch {
      setError('创建令牌失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`确定撤销令牌"${name}"？此操作不可恢复。`)) return;
    try {
      await revokeApiToken(id);
      await load();
    } catch {
      setError('撤销令牌失败');
    }
  };

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Sub-header description */}
          <p className="text-sm text-gray-500 mb-6">
            管理用于外部应用访问 Minimail API 的鉴权密钥
          </p>

          {/* API 调用地址 */}
          <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-xs font-medium text-gray-500 mb-1">API 调用地址</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm font-mono select-all">
                {window.location.origin}/api
              </code>
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(`${window.location.origin}/api`); }
                  catch { /* ignore */ }
                }}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded hover:bg-white hover:text-[#066da5]"
              >
                复制
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              在请求 Header 中添加 <code className="text-xs bg-gray-100 px-1 rounded">Authorization: Bearer &lt;令牌&gt;</code> 即可调用
            </p>
          </div>

          {/* Agent 调用示例 */}
          <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-xs font-medium text-gray-500 mb-1">🤖 Agent 调用示例</label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm font-mono select-all whitespace-pre-wrap break-all">
{`curl -H "Authorization: Bearer <你的令牌>" \\
  ${window.location.origin}/api/mail/folders`}
              </code>
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(`curl -H "Authorization: Bearer <你的令牌>" \\\n  ${window.location.origin}/api/mail/folders`); }
                  catch { /* ignore */ }
                }}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded hover:bg-white hover:text-[#066da5] self-start"
              >
                复制
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              将 <code className="text-xs bg-gray-100 px-1 rounded">&lt;你的令牌&gt;</code> 替换为上方创建的 API 密钥即可调用
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Created token (one-time display) */}
          {createdToken && (
            <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                ⚠️ 密钥已创建！请立即复制，关闭后将不再显示
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm font-mono break-all select-all">
                  {createdToken.token}
                </code>
                <button
                  onClick={() => {
                    try { navigator.clipboard.writeText(createdToken.token); }
                    catch { setError('复制失败，请手动复制'); }
                  }}
                  className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  复制
                </button>
              </div>
              <button
                onClick={() => setCreatedToken(null)}
                className="mt-2 text-xs text-yellow-700 hover:underline"
              >
                已复制，关闭
              </button>
            </div>
          )}

          {/* Create form */}
          {showCreate && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">新建 API 密钥</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">名称</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例如: 我的脚本"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">权限范围</label>
                    <select
                      value={newScopes}
                      onChange={(e) => setNewScopes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
                    >
                      <option value="read">只读 (read)</option>
                      <option value="read,write">读写 (read,write)</option>
                      <option value="admin">管理 (admin)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">过期</label>
                    <select
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#066da5] focus:outline-none"
                    >
                      <option value="0">永不过期</option>
                      <option value="7">7 天</option>
                      <option value="30">30 天</option>
                      <option value="90">90 天</option>
                      <option value="365">1 年</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-4 py-2 bg-[#066da5] text-white text-sm rounded hover:bg-[#05588a] disabled:opacity-50"
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Token list */}
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🔑</div>
              <p className="text-sm">暂无 API 密钥</p>
              <p className="text-xs mt-1 text-gray-400">点击上方"+ 新建密钥"创建</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${token.is_revoked ? 'bg-red-400' : 'bg-green-400'}`} />
                      <span className="text-sm font-medium text-gray-800">{token.name}</span>
                      <code className="text-xs text-gray-400 font-mono">{token.token_prefix}...</code>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>范围: {token.scopes}</span>
                      {token.expires_at && <span>过期: {new Date(token.expires_at).toLocaleDateString('zh-CN')}</span>}
                      {token.last_used_at && <span>最后使用: {new Date(token.last_used_at).toLocaleDateString('zh-CN')}</span>}
                      <span>创建: {new Date(token.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(token.id, token.name)}
                    disabled={token.is_revoked}
                    className={`ml-3 px-3 py-1 text-xs rounded ${
                      token.is_revoked
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {token.is_revoked ? '已撤销' : '撤销'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
