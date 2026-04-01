import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, ClipboardPaste, Hash, Package, X } from 'lucide-react';
import {
  supabaseConfigured,
  adminFetchBatches,
  adminCreateBatch,
  adminDeleteBatch,
  adminFetchActivationCountByBatch,
  DbSimBatch,
} from '../../services/supabase';

type InputMode = 'range' | 'paste' | 'csv';

const CHANNELS = ['amazon', 'temu', 'website', 'other'] as const;

const CHANNEL_COLORS: Record<string, string> = {
  amazon: 'bg-yellow-100 text-yellow-800',
  temu: 'bg-orange-100 text-orange-800',
  website: 'bg-blue-100 text-blue-800',
  other: 'bg-slate-100 text-slate-600',
};

const DEMO_BATCHES: DbSimBatch[] = [
  { id: '1', batch_name: 'Amazon US Batch #1', channel: 'amazon', iccid_start: '89852240810733410000', iccid_end: '89852240810733410499', iccids: null, total_count: 500, ship_date: '2026-03-01', notes: 'First batch', created_at: '2026-03-01T00:00:00Z' },
  { id: '2', batch_name: 'Temu Launch', channel: 'temu', iccid_start: null, iccid_end: null, iccids: ['89852240810733411000', '89852240810733411001', '89852240810733411002'], total_count: 3, ship_date: '2026-03-15', notes: null, created_at: '2026-03-15T00:00:00Z' },
];

const AdminSimBatches: React.FC = () => {
  const [batches, setBatches] = useState<DbSimBatch[]>([]);
  const [activationCounts, setActivationCounts] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('range');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [batchName, setBatchName] = useState('');
  const [channel, setChannel] = useState<string>('amazon');
  const [iccidStart, setIccidStart] = useState('');
  const [iccidEnd, setIccidEnd] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDemoMode = !supabaseConfigured;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    if (isDemoMode) {
      setBatches(DEMO_BATCHES);
      setActivationCounts({ '1': 42, '2': 1 });
    } else {
      const [b, c] = await Promise.all([
        adminFetchBatches(),
        adminFetchActivationCountByBatch(),
      ]);
      setBatches(b);
      setActivationCounts(c);
    }
    setLoading(false);
  }

  function resetForm() {
    setBatchName(''); setChannel('amazon'); setIccidStart(''); setIccidEnd('');
    setPasteText(''); setShipDate(''); setNotes(''); setError('');
    setInputMode('range');
  }

  function parseIccidsFromText(text: string): string[] {
    return text
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => /^\d{18,22}$/.test(s));
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1); // skip header
    const iccids: string[] = [];
    for (const line of lines) {
      const cols = line.split(',');
      const iccid = cols[0]?.trim();
      if (/^\d{18,22}$/.test(iccid)) iccids.push(iccid);
      const ch = cols[1]?.trim().toLowerCase();
      if (ch && CHANNELS.includes(ch as any)) setChannel(ch);
    }
    setPasteText(iccids.join('\n'));
    setInputMode('paste');
  }

  async function handleSubmit() {
    setError('');
    if (!batchName.trim()) { setError('Batch name is required'); return; }

    let iccidStartVal: string | null = null;
    let iccidEndVal: string | null = null;
    let iccidsArr: string[] | null = null;
    let totalCount = 0;

    if (inputMode === 'range') {
      if (!iccidStart || !iccidEnd) { setError('Both start and end ICCID are required'); return; }
      if (!/^\d{18,22}$/.test(iccidStart) || !/^\d{18,22}$/.test(iccidEnd)) {
        setError('ICCIDs must be 18-22 digits'); return;
      }
      iccidStartVal = iccidStart;
      iccidEndVal = iccidEnd;
      totalCount = Math.abs(parseInt(iccidEnd) - parseInt(iccidStart)) + 1;
    } else {
      const parsed = parseIccidsFromText(pasteText);
      if (parsed.length === 0) { setError('No valid ICCIDs found (need 18-22 digit numbers)'); return; }
      iccidsArr = parsed;
      totalCount = parsed.length;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        const fake: DbSimBatch = {
          id: crypto.randomUUID(), batch_name: batchName, channel,
          iccid_start: iccidStartVal, iccid_end: iccidEndVal, iccids: iccidsArr,
          total_count: totalCount, ship_date: shipDate || null, notes: notes || null,
          created_at: new Date().toISOString(),
        };
        setBatches(prev => [fake, ...prev]);
      } else {
        await adminCreateBatch({
          batch_name: batchName, channel,
          iccid_start: iccidStartVal, iccid_end: iccidEndVal, iccids: iccidsArr,
          total_count: totalCount, ship_date: shipDate || null, notes: notes || null,
        });
        await loadData();
      }
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this batch? Activation records will keep their data.')) return;
    if (isDemoMode) {
      setBatches(prev => prev.filter(b => b.id !== id));
    } else {
      await adminDeleteBatch(id);
      await loadData();
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SIM Batches</h2>
          <p className="text-sm text-slate-500 mt-0.5">Register ICCID batches and track which channel they ship to</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> New Batch
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add SIM Batch</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Batch Name */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Batch Name</label>
                <input
                  value={batchName} onChange={e => setBatchName(e.target.value)}
                  placeholder="e.g. Amazon US Batch #1"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>

              {/* Channel */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1">Channel</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNELS.map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        channel === ch ? 'bg-orange-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >{ch}</button>
                  ))}
                </div>
              </div>

              {/* Input Mode Tabs */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">ICCID Input Method</label>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {([
                    { mode: 'range' as InputMode, icon: Hash, label: 'Range' },
                    { mode: 'paste' as InputMode, icon: ClipboardPaste, label: 'Paste' },
                    { mode: 'csv' as InputMode, icon: Upload, label: 'CSV' },
                  ]).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setInputMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        inputMode === mode ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                      }`}
                    ><Icon size={14} />{label}</button>
                  ))}
                </div>
              </div>

              {/* Range Input */}
              {inputMode === 'range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Start ICCID</label>
                    <input
                      value={iccidStart} onChange={e => setIccidStart(e.target.value)}
                      placeholder="89852240810733410000"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">End ICCID</label>
                    <input
                      value={iccidEnd} onChange={e => setIccidEnd(e.target.value)}
                      placeholder="89852240810733410499"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                    />
                  </div>
                </div>
              )}

              {/* Paste / CSV Input */}
              {(inputMode === 'paste' || inputMode === 'csv') && (
                <div>
                  {inputMode === 'csv' && (
                    <div className="mb-3">
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                      >
                        <Upload size={16} /> Upload CSV file
                      </button>
                      <p className="text-[11px] text-slate-400 mt-1">CSV format: first column = ICCID, second column = channel (optional)</p>
                    </div>
                  )}
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    ICCIDs {inputMode === 'paste' ? '(one per line or comma-separated)' : '(parsed from CSV)'}
                  </label>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="89852240810733410000&#10;89852240810733410001&#10;89852240810733410002"
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
                  />
                  {pasteText && (
                    <p className="text-xs text-slate-500 mt-1">
                      {parseIccidsFromText(pasteText).length} valid ICCIDs detected
                    </p>
                  )}
                </div>
              )}

              {/* Ship Date + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Ship Date</label>
                  <input
                    type="date" value={shipDate} onChange={e => setShipDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
                  <input
                    value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >{saving ? 'Saving...' : 'Create Batch'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batches Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-900">No batches yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first batch to start tracking SIM activations.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-left">
                <th className="px-5 py-3 font-semibold">Batch</th>
                <th className="px-5 py-3 font-semibold">Channel</th>
                <th className="px-5 py-3 font-semibold text-right">SIMs</th>
                <th className="px-5 py-3 font-semibold text-right">Activated</th>
                <th className="px-5 py-3 font-semibold text-right">Rate</th>
                <th className="px-5 py-3 font-semibold">Ship Date</th>
                <th className="px-5 py-3 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => {
                const activated = activationCounts[b.id] || 0;
                const rate = b.total_count > 0 ? ((activated / b.total_count) * 100) : 0;
                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{b.batch_name}</p>
                      {b.notes && <p className="text-xs text-slate-400 mt-0.5">{b.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${CHANNEL_COLORS[b.channel] || CHANNEL_COLORS.other}`}>
                        {b.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">{b.total_count.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-green-600">{activated}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{rate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{b.ship_date || '—'}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSimBatches;
