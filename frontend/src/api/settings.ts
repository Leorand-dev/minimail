import api from '@/api/client';

export interface ImapConfig {
  host: string;
  port: number;
  ssl: boolean;
  username: string;
  password: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  ssl: boolean;
  username: string;
  password: string;
}

export interface MailSettings {
  imap: ImapConfig;
  smtp: SmtpConfig;
  configured: boolean;
}

export async function fetchMailSettings(): Promise<MailSettings> {
  const res = await api.get('/settings/mail');
  return res.data;
}

export async function updateMailSettings(
  imap: ImapConfig,
  smtp: SmtpConfig
): Promise<MailSettings> {
  const res = await api.put('/settings/mail', { imap, smtp });
  return res.data;
}

export async function testMailConnection(): Promise<{ status: string; message?: string; errors?: string[] }> {
  const res = await api.post('/settings/mail/test');
  return res.data;
}
