import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Tag, Zap, Loader2 } from 'lucide-react';
import {
  DbNotification,
  supabaseConfigured,
  adminFetchAllNotifications,
  adminCreateNotification,
  adminUpdateNotification,
  adminDeleteNotification,
} from '../../services/supabase';

const EMPTY: Omit<DbNotification, 'id' | 'created_at'> = {
  type: 'promo',
  title_en: '',
  title_zh: '',
  title_es: '',
  body_en: '',
  body_zh: '',
  body_es: '',
  action_label: null,
  action_target: null,
  country_code: null,
  active: true,
};

const DEMO_NOTIFICATIONS: DbNotification[] = [
  {
    id: 'demo-1',
    type: 'promo',
    title_en: '50% Off Your Next eSIM',
    title_zh: '下一张eSIM享5折',
    title_es: '50% de descuento en tu próximo eSIM',
    body_en: 'First-time purchase? Get 50% off any eSIM plan. Limited time offer — don\'t miss out!',
    body_zh: '首次购买？任何eSIM套餐享5折优惠。限时优惠，不要错过！',
    body_es: '¿Primera compra? Obtén 50% de descuento en cualquier plan eSIM. Oferta por tiempo limitado.',
    action_label: 'Shop Now',
    action_target: 'ESIM',
    country_code: null,
    active: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'demo-2',
    type: 'service',
    title_en: 'New: Evair eCard Support',
    title_zh: '新功能：Evair eCard支持',
    title_es: 'Nuevo: Soporte Evair eCard',
    body_en: 'You can now use eSIM on any phone with Evair eCard. Insert, bind, and download profiles instantly.',
    body_zh: '现在您可以通过Evair eCard在任何手机上使用eSIM。插入、绑定并即时下载配置文件。',
    body_es: 'Ahora puedes usar eSIM en cualquier teléfono con Evair eCard.',
    action_label: null,
    action_target: null,
    country_code: null,
    active: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

const AdminNotifications: React.FC = () => {
  const [notifs, setNotifs] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const isDemoMode = !supabaseConfigured;

  const load = async () => {
    setLoading(true);
    if (isDemoMode) {
      setNotifs(DEMO_NOTIFICATIONS);
    } else {
      const data = await adminFetchAllNotifications();
      setNotifs(data);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowEditor(true);
  };

  const openEdit = (n: DbNotification) => {
    setEditId(n.id);
    setForm({
      type: n.type,
      title_en: n.title_en,
      title_zh: n.title_zh,
      title_es: n.title_es,
      body_en: n.body_en,
      body_zh: n.body_zh,
      body_es: n.body_es,
      action_label: n.action_label,
      action_target: n.action_target,
      country_code: n.country_code,
      active: n.active,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isDemoMode) {
        if (editId) {
          setNotifs(prev => prev.map(n => n.id === editId ? { ...n, ...form } : n));
        } else {
          const newNotif: DbNotification = {
            ...form,
            id: `demo-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          setNotifs(prev => [newNotif, ...prev]);
        }
        setShowEditor(false);
      } else {
        if (editId) {
          await adminUpdateNotification(editId, form);
        } else {
          await adminCreateNotification(form);
        }
        setShowEditor(false);
        await load();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification permanently?')) return;
    if (isDemoMode) {
      setNotifs(prev => prev.filter(n => n.id !== id));
    } else {
      await adminDeleteNotification(id);
      await load();
    }
  };

  const handleToggleActive = async (n: DbNotification) => {
    if (isDemoMode) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, active: !x.active } : x));
    } else {
      await adminUpdateNotification(n.id, { active: !n.active });
      await load();
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-500 mt-1">Create and manage promotional & service messages sent to all customers.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl shadow-sm hover:bg-orange-600 active:scale-[0.98] transition-all text-sm"
        >
          <Plus size={18} />
          New Notification
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Tag size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No notifications yet</h3>
          <p className="text-slate-500">Create your first notification to send to customers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id} className={`bg-white rounded-xl border p-5 flex items-start gap-4 ${n.active ? 'border-slate-100' : 'border-slate-100 opacity-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'promo' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                {n.type === 'promo' ? <Tag size={18} className="text-purple-500" /> : <Zap size={18} className="text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[15px] font-bold text-slate-900 truncate">{n.title_en || '(untitled)'}</h4>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${n.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                    {n.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">{n.type}</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-1.5">{n.body_en || '(no body)'}</p>
                <p className="text-xs text-slate-400">{formatDate(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => handleToggleActive(n)} className="w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors" title={n.active ? 'Deactivate' : 'Activate'}>
                  {n.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => openEdit(n)} className="w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(n.id)} className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={() => setShowEditor(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 mb-10">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{editId ? 'Edit Notification' : 'New Notification'}</h3>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as 'promo' | 'service' })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="promo">Promo</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">Country Code (optional)</label>
                <input
                  value={form.country_code || ''}
                  onChange={e => setForm({ ...form, country_code: e.target.value || null })}
                  placeholder="e.g. US, JP"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* Multilingual Title */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-slate-600 block mb-1.5">Title</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6">EN</span>
                  <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} placeholder="English title" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6">ZH</span>
                  <input value={form.title_zh} onChange={e => setForm({ ...form, title_zh: e.target.value })} placeholder="Chinese title (optional)" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6">ES</span>
                  <input value={form.title_es} onChange={e => setForm({ ...form, title_es: e.target.value })} placeholder="Spanish title (optional)" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
                </div>
              </div>
            </div>

            {/* Multilingual Body */}
            <div className="mb-5">
              <label className="text-sm font-semibold text-slate-600 block mb-1.5">Body</label>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6 mt-3">EN</span>
                  <textarea value={form.body_en} onChange={e => setForm({ ...form, body_en: e.target.value })} placeholder="English body text" rows={3} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6 mt-3">ZH</span>
                  <textarea value={form.body_zh} onChange={e => setForm({ ...form, body_zh: e.target.value })} placeholder="Chinese body (optional)" rows={2} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6 mt-3">ES</span>
                  <textarea value={form.body_es} onChange={e => setForm({ ...form, body_es: e.target.value })} placeholder="Spanish body (optional)" rows={2} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">Action Label (optional)</label>
                <input
                  value={form.action_label || ''}
                  onChange={e => setForm({ ...form, action_label: e.target.value || null })}
                  placeholder="e.g. Shop Now"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-1.5">Action Target (optional)</label>
                <input
                  value={form.action_target || ''}
                  onChange={e => setForm({ ...form, action_target: e.target.value || null })}
                  placeholder="e.g. ESIM"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`w-12 h-7 rounded-full p-1 transition-colors relative ${form.active ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-medium text-slate-700">{form.active ? 'Active — visible to customers' : 'Inactive — hidden from customers'}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEditor(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title_en.trim()}
                className="px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
