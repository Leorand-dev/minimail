import api from '@/api/client';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    language: string;
    theme: string;
    messages_per_page: number;
    preview_pane: boolean;
    is_active: boolean;
    created_at: string;
  };
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/refresh', { refresh_token: token });
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}
