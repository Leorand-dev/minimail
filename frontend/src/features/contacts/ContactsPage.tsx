import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchContacts, createContact, updateContact, deleteContact, fetchGroups } from '@/api/contacts';
import type { Contact, ContactGroup } from '@/api/contacts';

interface ContactsPageProps {
  onBack?: () => void;
}
export default function ContactsPage({ onBack }: ContactsPageProps) {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({
    display_name: '', email: '', phone: '', phone_mobile: '',
    organization: '', notes: '', group_id: '',
  });

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const [cRes, gRes] = await Promise.all([
        fetchContacts({ search, page: p, page_size: 50 }), fetchGroups(),
      ]);
      setContacts(cRes.contacts); setTotal(cRes.total); setTotalPages(cRes.total_pages);
      if (gRes.length) setGroups(gRes);
    } catch { setError('加载失败'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(page); }, [page, load]);

  // Listen for panel-new event from parent header
  useEffect(() => {
    const handler = () => {
      setForm({ display_name: '', email: '', phone: '', phone_mobile: '', organization: '', notes: '', group_id: '' });
      setEditing(null);
      setShowForm(true);
    };
    window.addEventListener('panel-new', handler);
    return () => window.removeEventListener('panel-new', handler);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 300);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() && !form.email.trim()) { setError('请输入姓名或邮箱'); return; }
    setError('');
    try {
      if (editing) { await updateContact(editing.id, form); }
      else { await createContact(form); }
      setShowForm(false); setEditing(null);
      setForm({ display_name: '', email: '', phone: '', phone_mobile: '', organization: '', notes: '', group_id: '' });
      load(page);
    } catch { setError('保存失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此联系人？')) return;
    try { await deleteContact(id); load(page); } catch { setError('删除失败'); }
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200">
        <input type="text" value={searchInput} onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="搜索联系人..."
          className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:border-[#066da5] focus:outline-none" />
      </div>

      {/* Error */}
      {error && <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm">{error}</div>}

      {/* Form dialog */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="max-w-md space-y-2">
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="姓名" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="邮箱" type="email" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
            <input value={form.phone_mobile} onChange={(e) => setForm({ ...form, phone_mobile: e.target.value })} placeholder="手机" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
            <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="公司" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="备注" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
            <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              <option value="">无分组</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} className="px-3 py-1 text-sm bg-[#066da5] text-white rounded hover:bg-[#05588a]">保存</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">加载中...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm">暂无联系人</p>
          </div>
        ) : (
          <div>
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-[#066da5] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mr-3">
                  {(c.display_name || c.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.display_name || '(未命名)'}</div>
                  <div className="text-xs text-gray-400 truncate">{c.email}{c.organization ? ` · ${c.organization}` : ''}</div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => { setEditing(c); setForm({ display_name: c.display_name, email: c.email, phone: c.phone || '', phone_mobile: c.phone_mobile || '', organization: c.organization || '', notes: c.notes || '', group_id: c.group_id || '' }); setShowForm(true); }} className="px-2 py-0.5 text-xs text-[#066da5] hover:bg-blue-50 rounded">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded">删除</button>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-3">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 text-xs text-gray-500 border rounded disabled:opacity-30">上一页</button>
                <span className="text-xs text-gray-400">{page}/{totalPages} (共{total})</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 text-xs text-gray-500 border rounded disabled:opacity-30">下一页</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
