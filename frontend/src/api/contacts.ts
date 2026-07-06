import api from '@/api/client';

export interface Contact {
  id: string;
  user_id: string;
  group_id: string | null;
  group_name: string | null;
  display_name: string;
  first_name: string;
  last_name: string;
  nickname: string;
  organization: string;
  title: string;
  email: string;
  email_alt: string[];
  email_business: string;
  phone: string;
  phone_mobile: string;
  phone_business: string;
  address: string;
  address_business: string;
  website: string;
  notes: string;
  avatar_url: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  contact_count: number;
  created_at: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── 分组 ──

export async function fetchGroups(): Promise<ContactGroup[]> {
  const res = await api.get('/api/contacts/groups');
  return res.data;
}

export async function createGroup(name: string, color?: string): Promise<ContactGroup> {
  const res = await api.post('/api/contacts/groups', { name, color });
  return res.data;
}

export async function updateGroup(id: string, data: Partial<ContactGroup>): Promise<ContactGroup> {
  const res = await api.put(`/api/contacts/groups/${id}`, data);
  return res.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/api/contacts/groups/${id}`);
}

// ── 联系人 ──

export async function fetchContacts(params: {
  group_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
  favorites_only?: boolean;
} = {}): Promise<ContactsResponse> {
  const res = await api.get('/api/contacts', { params });
  return res.data;
}

export async function fetchContact(id: string): Promise<Contact> {
  const res = await api.get(`/api/contacts/${id}`);
  return res.data;
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  const res = await api.post('/api/contacts', data);
  return res.data;
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
  const res = await api.put(`/api/contacts/${id}`, data);
  return res.data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/api/contacts/${id}`);
}

export async function batchDeleteContacts(ids: string[]): Promise<{ deleted: number }> {
  const res = await api.post('/api/contacts/batch-delete', ids);
  return res.data;
}

export async function autocompleteContacts(query: string, limit = 10): Promise<Contact[]> {
  const res = await api.get('/api/contacts/autocomplete', { params: { query, limit } });
  return res.data;
}
