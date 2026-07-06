import api from '@/api/client';

export interface EmailAccount {
  id: string;
  email: string;
  name: string;
  imap_host: string | null;
  imap_port: number;
  imap_ssl: boolean;
  imap_username: string | null;
  imap_password_masked: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_ssl: boolean;
  smtp_username: string | null;
  smtp_password_masked: boolean;
  is_default: boolean;
  created_at: string;
  configured: boolean;
}

export interface AccountCreateRequest {
  email: string;
  name?: string;
  imap_host?: string;
  imap_port?: number;
  imap_ssl?: boolean;
  imap_username?: string;
  imap_password?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_ssl?: boolean;
  smtp_username?: string;
  smtp_password?: string;
  is_default?: boolean;
}

export async function fetchAccounts(): Promise<EmailAccount[]> {
  const res = await api.get('/api/settings/accounts');
  return res.data;
}

export async function createAccount(data: AccountCreateRequest): Promise<EmailAccount> {
  const res = await api.post('/api/settings/accounts', data);
  return res.data;
}

export async function updateAccount(id: string, data: Partial<AccountCreateRequest>): Promise<EmailAccount> {
  const res = await api.put(`/api/settings/accounts/${id}`, data);
  return res.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/api/settings/accounts/${id}`);
}

export async function setDefaultAccount(id: string): Promise<EmailAccount> {
  const res = await api.post(`/api/settings/accounts/${id}/default`);
  return res.data;
}
