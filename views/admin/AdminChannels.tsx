import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, MapPin } from 'lucide-react';
import {
  supabaseConfigured,
  adminFetchBatches,
  adminFetchActivations,
  DbSimBatch,
  DbSimActivation,
} from '../../services/supabase';

const US_STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC',
};

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  amazon: { label: 'Amazon', color: '#FF9900', bg: 'bg-yellow-50 border-yellow-200' },
  temu: { label: 'Temu', color: '#FF6600', bg: 'bg-orange-50 border-orange-200' },
  website: { label: 'Website', color: '#3B82F6', bg: 'bg-blue-50 border-blue-200' },
  other: { label: 'Other', color: '#6B7280', bg: 'bg-slate-50 border-slate-200' },
};

const DEMO_BATCHES: DbSimBatch[] = [
  { id: '1', batch_name: 'Amazon Batch #1', channel: 'amazon', iccid_start: '89852240810733410000', iccid_end: '89852240810733410499', iccids: null, total_count: 500, ship_date: '2026-02-15', notes: null, created_at: '2026-02-15T00:00:00Z' },
  { id: '2', batch_name: 'Amazon Batch #2', channel: 'amazon', iccid_start: '89852240810733411000', iccid_end: '89852240810733411299', iccids: null, total_count: 300, ship_date: '2026-03-01', notes: null, created_at: '2026-03-01T00:00:00Z' },
  { id: '3', batch_name: 'Temu Launch', channel: 'temu', iccid_start: '89852240810733412000', iccid_end: '89852240810733412199', iccids: null, total_count: 200, ship_date: '2026-03-10', notes: null, created_at: '2026-03-10T00:00:00Z' },
];

const DEMO_ACTIVATIONS: DbSimActivation[] = [
  ...Array.from({ length: 85 }, (_, i) => ({
    id: `a${i}`, iccid: `8985224081073341${String(i).padStart(4, '0')}`,
    activated_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    batch_id: i < 55 ? '1' : '2', channel: 'amazon',
    country: 'US', region: ['CA','TX','NY','FL','IL','WA'][Math.floor(Math.random() * 6)],
    city: null, device: Math.random() > 0.4 ? 'iPhone' : 'Android', user_agent: null,
  })),
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `t${i}`, iccid: `898522408107341200${String(i).padStart(2, '0')}`,
    activated_at: new Date(Date.now() - Math.random() * 18 * 86400000).toISOString(),
    batch_id: '3', channel: 'temu',
    country: 'US', region: ['CA','TX','FL','NV'][Math.floor(Math.random() * 4)],
    city: null, device: Math.random() > 0.6 ? 'iPhone' : 'Android', user_agent: null,
  })),
];

interface ChannelStats {
  channel: string;
  totalShipped: number;
  totalActivated: number;
  rate: number;
  avgDaysToActivate: number;
  topStates: { state: string; count: number }[];
}

function computeChannelStats(batches: DbSimBatch[], activations: DbSimActivation[]): ChannelStats[] {
  const channels = new Set<string>();
  batches.forEach(b => channels.add(b.channel));
  activations.forEach(a => { if (a.channel) channels.add(a.channel); });

  return Array.from(channels).map(ch => {
    const chBatches = batches.filter(b => b.channel === ch);
    const chActivations = activations.filter(a => a.channel === ch);
    const totalShipped = chBatches.reduce((sum, b) => sum + b.total_count, 0);
    const totalActivated = chActivations.length;
    const rate = totalShipped > 0 ? (totalActivated / totalShipped) * 100 : 0;

    // Avg days from ship to activation
    let totalDays = 0;
    let countedDays = 0;
    for (const act of chActivations) {
      const batch = chBatches.find(b => b.id === act.batch_id);
      if (batch?.ship_date) {
        const diff = (new Date(act.activated_at).getTime() - new Date(batch.ship_date).getTime()) / 86400000;
        if (diff >= 0) { totalDays += diff; countedDays++; }
      }
    }
    const avgDaysToActivate = countedDays > 0 ? totalDays / countedDays : 0;

    // Top US states
    const stateCounts: Record<string, number> = {};
    for (const act of chActivations) {
      if (act.region) stateCounts[act.region] = (stateCounts[act.region] || 0) + 1;
    }
    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([state, count]) => ({ state, count }));

    return { channel: ch, totalShipped, totalActivated, rate, avgDaysToActivate, topStates };
  }).sort((a, b) => b.totalShipped - a.totalShipped);
}

const AdminChannels: React.FC = () => {
  const [batches, setBatches] = useState<DbSimBatch[]>([]);
  const [activations, setActivations] = useState<DbSimActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !supabaseConfigured;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    if (isDemoMode) {
      setBatches(DEMO_BATCHES);
      setActivations(DEMO_ACTIVATIONS);
    } else {
      const [b, a] = await Promise.all([adminFetchBatches(), adminFetchActivations()]);
      setBatches(b);
      setActivations(a);
    }
    setLoading(false);
  }

  const stats = computeChannelStats(batches, activations);
  const totalActivated = activations.length;
  const totalShipped = batches.reduce((s, b) => s + b.total_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Channel Comparison</h2>
          <p className="text-sm text-slate-500 mt-0.5">Compare activation performance across sales channels</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-2xl font-bold text-slate-900">{totalShipped.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Total SIMs Shipped</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-2xl font-bold text-green-600">{totalActivated.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Total Activated</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-2xl font-bold text-orange-600">
            {totalShipped > 0 ? ((totalActivated / totalShipped) * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Overall Activation Rate</p>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-900">No channel data yet</p>
          <p className="text-sm text-slate-500 mt-1">Create SIM batches and track activations to see channel comparisons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.map(s => {
            const cfg = CHANNEL_CONFIG[s.channel] || CHANNEL_CONFIG.other;
            return (
              <div key={s.channel} className={`rounded-2xl shadow-sm border p-6 ${cfg.bg}`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-900">{cfg.label}</h3>
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color: cfg.color }}
                  >{s.rate.toFixed(1)}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-3 bg-white/60 rounded-full overflow-hidden mb-5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(s.rate, 100)}%`, backgroundColor: cfg.color }}
                  />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{s.totalShipped.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Shipped</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{s.totalActivated.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Activated</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">
                      {s.avgDaysToActivate > 0 ? `${s.avgDaysToActivate.toFixed(1)}d` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">Avg Time</p>
                  </div>
                </div>

                {/* Top states */}
                {s.topStates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Top US States</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.topStates.map(st => (
                        <span key={st.state} className="bg-white/80 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700">
                          {US_STATE_NAMES[st.state] || st.state} <span className="text-slate-400">({st.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminChannels;
