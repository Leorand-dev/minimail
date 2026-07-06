import api from '@/api/client';

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_revoked: boolean;
  created_at: string;
}

export interface ApiTokenCreated extends ApiToken {
  token: string;
}

export async function fetchApiTokens(includeRevoked = false): Promise<ApiToken[]> {
  const res = await api.get(`/auth/tokens?include_revoked=${includeRevoked}`);
  return res.data;
}

export async function createApiToken(name: string, scopes = 'read', expiresInDays = 0): Promise<ApiTokenCreated> {
  const res = await api.post('/auth/tokens', { name, scopes, expires_in_days: expiresInDays });
  return res.data;
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  await api.delete(`/auth/tokens/${tokenId}`);
}
