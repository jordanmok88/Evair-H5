import React, { useState, useEffect } from 'react';
import { RefreshCw, QrCode, Smartphone, Globe, MapPin } from 'lucide-react';
import { supabaseConfigured, adminFetchQrScans, DbQrScan } from '../../services/supabase';

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

const DEMO_SCANS: DbQrScan[] = Array.from({ length: 47 }, (_, i) => ({
  id: String(i),
  scanned_at: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
  source: ['amazon', 'temu', 'direct', 'card'][Math.floor(Math.random() * 4)],
  country: Math.random() > 0.3 ? 'US' : ['CN', 'MX', 'CA', 'GB'][Math.floor(Math.random() * 4)],
  region: ['CA', 'TX', 'NY', 'FL', 'IL', 'WA', 'NV', null][Math.floor(Math.random() * 8)],
  city: ['Los Angeles', 'Houston', 'New York', 'Miami', null][Math.floor(Math.random() * 5)],
  device: ['iPhone', 'Android', 'Mac', 'other'][Math.floor(Math.random() * 4)],
  user_agent: 'Mozilla/5.0',
  ip_hash: 'abc123',
}));

function BarChart({ data, maxVal }: { data: { label: string; value: number; color?: string }[]; maxVal: number }) {
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 w-24 text-right truncate capitalize">{d.label}</span>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%`, backgroundColor: d.color || '#FF6600' }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-8">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

const AdminAnalytics: React.FC = () => {
  const [scans, setScans] = useState<DbQrScan[]>([]);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !supabaseConfigured;

  useEffect(() => { loadScans(); }, []);

  async function loadScans() {
    setLoading(true);
    if (isDemoMode) {
      setScans(DEMO_SCANS);
    } else {
      setScans(await adminFetchQrScans());
    }
    setLoading(false);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;

  const scansToday = scans.filter(s => new Date(s.scanned_at).getTime() >= todayStart).length;
  const scansWeek = scans.filter(s => new Date(s.scanned_at).getTime() >= weekStart).length;

  // Group by source
  const bySource: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byState: Record<string, number> = {};

  for (const s of scans) {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
    if (s.device) byDevice[s.device] = (byDevice[s.device] || 0) + 1;
    if (s.country) byCountry[s.country] = (byCountry[s.country] || 0) + 1;
    if (s.country === 'US' && s.region) byState[s.region] = (byState[s.region] || 0) + 1;
  }

  const sortedSource = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const sortedDevice = Object.entries(byDevice).sort((a, b) => b[1] - a[1]);
  const sortedCountry = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedState = Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const sourceColors: Record<string, string> = { amazon: '#FF9900', temu: '#FF6600', direct: '#3B82F6', card: '#10B981', website: '#8B5CF6' };

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
          <h2 className="text-xl font-bold text-slate-900">QR Scan Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track who scans your QR codes and where they come from</p>
        </div>
        <button onClick={loadScans} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Scans', value: scans.length, icon: QrCode, color: 'text-orange-600 bg-orange-50' },
          { label: 'Today', value: scansToday, icon: QrCode, color: 'text-blue-600 bg-blue-50' },
          { label: 'This Week', value: scansWeek, icon: QrCode, color: 'text-green-600 bg-green-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {scans.length === 0 ? (
        <div className="text-center py-16">
          <QrCode size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-900">No scans yet</p>
          <p className="text-sm text-slate-500 mt-1">Once people scan your QR code, analytics will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Source */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode size={16} className="text-orange-500" />
              <h3 className="font-bold text-slate-900">By Source</h3>
            </div>
            <BarChart
              data={sortedSource.map(([k, v]) => ({ label: k, value: v, color: sourceColors[k] || '#94A3B8' }))}
              maxVal={sortedSource[0]?.[1] || 1}
            />
          </div>

          {/* By Device */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={16} className="text-blue-500" />
              <h3 className="font-bold text-slate-900">By Device</h3>
            </div>
            <BarChart
              data={sortedDevice.map(([k, v]) => ({ label: k, value: v, color: '#3B82F6' }))}
              maxVal={sortedDevice[0]?.[1] || 1}
            />
          </div>

          {/* By Country */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-green-500" />
              <h3 className="font-bold text-slate-900">By Country</h3>
            </div>
            <BarChart
              data={sortedCountry.map(([k, v]) => ({ label: k, value: v, color: '#10B981' }))}
              maxVal={sortedCountry[0]?.[1] || 1}
            />
          </div>

          {/* By US State */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-purple-500" />
              <h3 className="font-bold text-slate-900">By US State</h3>
            </div>
            {sortedState.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No US state data yet</p>
            ) : (
              <BarChart
                data={sortedState.map(([k, v]) => ({ label: US_STATE_NAMES[k] || k, value: v, color: '#8B5CF6' }))}
                maxVal={sortedState[0]?.[1] || 1}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
