import api from '@/api/client';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  language: string;
  theme: string;
  messages_per_page: number;
  preview_pane: boolean;
  is_active: boolean;
  created_at: string;
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function updateProfile(name: string, username?: string): Promise<UserProfile> {
  const res = await api.put('/auth/profile', { name, username });
  return res.data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api.put('/auth/password', { current_password, new_password });
}
