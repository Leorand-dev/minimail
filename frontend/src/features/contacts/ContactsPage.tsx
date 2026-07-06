import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchContacts, fetchGroups, createContact, updateContact, deleteContact } from '@/api/contacts';
import type { Contact, ContactGroup, ContactsResponse } from '@/api/contacts';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({
    display_name: '', email: '', phone: '', phone_mobile: '',
    organization: '', notes: '', group_id: '',
  });

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const [cRes, gRes] = await Promise.all([
        fetchContacts({ search, page: p, page_size: 50 }),
        fetchGroups(),
      ]);
      setContacts(cRes.contacts);
      setTotal(cRes.total);
      setTotalPages(cRes.total_pages);
      if (gRes.length) setGroups(gRes);
    } catch { setError('加载失败'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(page); }, [page, load]);

  const handleSave = async () => {
    try {
      if (editing) {
        await updateContact(editing.id, form);
      } else {
        await createContact(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ display_name: '', email: '', phone: '', phone_mobile: '', organization: '', notes: '', group_id: '' });
      load(1);
    } catch { setError('保存失败'); }
  };

  const handleEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      display_name: c.display_name,
      email: c.email,
      phone: c.phone,
      phone_mobile: c.phone_mobile,
      organization: c.organization,
      notes: c.notes,
      group_id: c.group_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此联系人？')) return;
    try {
      await deleteContact(id);
      load(page);
    } catch { setError('删除失败'); }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Toolbar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
        <button onClick={() => navigate('/mail')} className="text-sm text-[#066da5] hover:underline">← 返回邮箱</button>
        <span className="flex-1 text-sm font-semibold text-gray-700">通讯录</span>
        <button
          onClick={() => { setEditing(null); setForm({ display_name: '', email: '', phone: '', phone_mobile: '', organization: '', notes: '', group_id: '' }); setShowForm(true); }}
          className="px-3 py-1 text-sm text-white bg-[#066da5] rounded hover:bg-[#05588a]"
        >+ 新建</button>
      </header>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索联系人..."
          className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:border-[#066da5] focus:outline-none"
        />
      </div>

      {error && <div className="mx-3 mt-2 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-4">{editing ? '编辑联系人' : '新建联系人'}</h2>
            <div className="space-y-3">
              <input placeholder="姓名" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
              <input placeholder="邮箱" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
              <input placeholder="手机" value={form.phone_mobile} onChange={e => setForm({...form, phone_mobile: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
              <input placeholder="电话" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
              <input placeholder="公司/组织" value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} className="w-full px-3 py-2 text-sm border rounded" />
              <textarea placeholder="备注" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 text-sm border rounded resize-none" rows={2} />
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm text-gray-500 border rounded hover:bg-gray-50">取消</button>
                <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white bg-[#066da5] rounded hover:bg-[#05588a]">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8 text-gray-400"><div className="w-5 h-5 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin mr-2" />加载中...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {search ? '无匹配联系人' : '暂无联系人，点击上方"新建"添加'}
          </div>
        ) : (
          <div>
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 group">
                <div className="w-9 h-9 rounded-full bg-[#066da5] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(c.display_name || c.email || '?')[0].toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.display_name || '(无姓名)'}</div>
                  <div className="text-xs text-gray-400 truncate">{c.email}{c.phone_mobile ? ` · ${c.phone_mobile}` : ''}</div>
                </div>
                {c.organization && <div className="hidden sm:block text-xs text-gray-400 mr-3">{c.organization}</div>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(c)} className="px-2 py-1 text-xs text-[#066da5] hover:bg-blue-50 rounded">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
          <span>共 {total} 人</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30">← 上一页</button>
            <span className="font-medium">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-0.5 rounded hover:bg-gray-200 disabled:opacity-30">下一页 →</button>
          </div>
        </div>
      )}
    </div>
  );
}
