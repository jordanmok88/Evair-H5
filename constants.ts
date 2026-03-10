import { Country, Plan, Order, ActiveSim, ECard, AppNotification } from './types';

// Pricing: (data_MB × rate_per_MB) × 2 (100% markup) + $10 shipping, rounded up to .99
function calcPrice(rateMB: number, gb: number): number {
  const raw = (gb * 1024 * rateMB) * 2 + 10;
  return Math.ceil(raw) - 0.01;
}

function makePlans(id: string, rate: number): Plan[] {
  return [
    { id: `${id}-1`, name: 'Starter', data: '1 GB', days: 7, price: calcPrice(rate, 1), features: ['4G/5G', 'VPN Included', 'No Roaming Fees'] },
    { id: `${id}-2`, name: 'Standard', data: '3 GB', days: 15, price: calcPrice(rate, 3), features: ['4G/5G', 'VPN Included', 'Hotspot'], isPopular: true },
    { id: `${id}-3`, name: 'Advanced', data: '5 GB', days: 30, price: calcPrice(rate, 5), features: ['4G/5G', 'VPN Included', 'Hotspot', 'Priority Support'], isBestValue: true },
    { id: `${id}-4`, name: 'Pro', data: '10 GB', days: 30, price: calcPrice(rate, 10), features: ['4G/5G', 'VPN Included', 'Hotspot', 'Priority Support'] },
  ];
}

const countryCodeToFlag = (cc: string): string =>
  cc.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

interface RawCountry {
  name: string;
  code: string;
  region: string;
  networks: string[];
  vpmn: string; // One VPMN per country per supplier PDF
  rate: number;
  popular?: boolean;
}

const RAW: RawCountry[] = [
  // ===== Asia-Pacific (IoT-A) — one VPMN per country per PDF =====
  { name: 'Australia', code: 'AU', region: 'Asia Pacific', networks: ['Optus'], vpmn: 'AUSOP', rate: 0.0015, popular: true },
  { name: 'Cambodia', code: 'KH', region: 'Asia Pacific', networks: ['Metfone', 'Hello Axiata'], vpmn: 'KHMVC', rate: 0.0021 },
  { name: 'China', code: 'CN', region: 'Asia Pacific', networks: ['China Telecom', 'China Unicom'], vpmn: 'CHNDX', rate: 0.0014, popular: true },
  { name: 'Hong Kong', code: 'HK', region: 'Asia Pacific', networks: ['HKT', 'CSL'], vpmn: 'HKGTC', rate: 0.0016, popular: true },
  { name: 'Indonesia', code: 'ID', region: 'Asia Pacific', networks: ['Telkomsel', 'Hutchison', 'Indosat'], vpmn: 'IDNTS', rate: 0.0014 },
  { name: 'Japan', code: 'JP', region: 'Asia Pacific', networks: ['KDDI', 'SoftBank'], vpmn: 'JPNKI', rate: 0.0014, popular: true },
  { name: 'South Korea', code: 'KR', region: 'Asia Pacific', networks: ['SK Telecom', 'LG U+', 'KT'], vpmn: 'KORSK', rate: 0.0018, popular: true },
  { name: 'Macau', code: 'MO', region: 'Asia Pacific', networks: ['CTM', 'China Telecom'], vpmn: 'MACCT', rate: 0.0014 },
  { name: 'Malaysia', code: 'MY', region: 'Asia Pacific', networks: ['Celcom', 'Digi', 'Maxis'], vpmn: 'MYSCC', rate: 0.0014, popular: true },
  { name: 'New Zealand', code: 'NZ', region: 'Asia Pacific', networks: ['Spark', 'Two Degrees', 'Vodafone'], vpmn: 'NZLTM', rate: 0.0018 },
  { name: 'Philippines', code: 'PH', region: 'Asia Pacific', networks: ['Globe', 'Smart'], vpmn: 'PHLGT', rate: 0.0017 },
  { name: 'Singapore', code: 'SG', region: 'Asia Pacific', networks: ['SingTel', 'StarHub'], vpmn: 'SGPST', rate: 0.0014, popular: true },
  { name: 'Taiwan', code: 'TW', region: 'Asia Pacific', networks: ['Chunghwa', 'FarEasTone', 'Taiwan Mobile'], vpmn: 'TWNLD', rate: 0.0014 },
  { name: 'Thailand', code: 'TH', region: 'Asia Pacific', networks: ['AIS', 'dtac', 'True Move'], vpmn: 'THAWN', rate: 0.0014, popular: true },
  { name: 'Vietnam', code: 'VN', region: 'Asia Pacific', networks: ['MobiFone', 'Viettel', 'Vietnamobile'], vpmn: 'VNMMO', rate: 0.0017 },

  // ===== Europe (IoT-M) =====
  { name: 'Albania', code: 'AL', region: 'Europe', networks: ['Vodafone'], vpmn: 'ALBVF', rate: 0.0010 },
  { name: 'Austria', code: 'AT', region: 'Europe', networks: ['3', 'Orange', 'A1'], vpmn: 'AUTCA', rate: 0.0010 },
  { name: 'Belarus', code: 'BY', region: 'Europe', networks: ['A1', 'Life:)'], vpmn: 'BLRMD', rate: 0.0021 },
  { name: 'Belgium', code: 'BE', region: 'Europe', networks: ['Proximus', 'BASE', 'Orange'], vpmn: 'BELTB', rate: 0.0008 },
  { name: 'Bosnia and Herzegovina', code: 'BA', region: 'Europe', networks: ['BH Telecom', 'HT Eronet'], vpmn: 'BIHPT', rate: 0.0018 },
  { name: 'Bulgaria', code: 'BG', region: 'Europe', networks: ['Vivacom', 'A1', 'Yettel'], vpmn: 'BGRVA', rate: 0.0009 },
  { name: 'Croatia', code: 'HR', region: 'Europe', networks: ['Tele2', 'A1'], vpmn: 'HRVT2', rate: 0.0009 },
  { name: 'Cyprus', code: 'CY', region: 'Europe', networks: ['Epic', 'PrimeTel'], vpmn: 'CYPSC', rate: 0.0011 },
  { name: 'Czech Republic', code: 'CZ', region: 'Europe', networks: ['T-Mobile', 'O2', 'Vodafone'], vpmn: 'CZERM', rate: 0.0009 },
  { name: 'Denmark', code: 'DK', region: 'Europe', networks: ['TDC', 'Telenor', 'Telia', '3'], vpmn: 'DNKTD', rate: 0.0009 },
  { name: 'Estonia', code: 'EE', region: 'Europe', networks: ['Elisa', 'Tele2', 'Telia'], vpmn: 'ESTRE', rate: 0.0008 },
  { name: 'Finland', code: 'FI', region: 'Europe', networks: ['Elisa', 'DNA'], vpmn: 'FINRL', rate: 0.0009 },
  { name: 'France', code: 'FR', region: 'Europe', networks: ['Bouygues', 'Orange', 'SFR'], vpmn: 'FRAF3', rate: 0.0009, popular: true },
  { name: 'Germany', code: 'DE', region: 'Europe', networks: ['O2', 'E-Plus', 'Vodafone'], vpmn: 'DEUE2', rate: 0.0009, popular: true },
  { name: 'Greece', code: 'GR', region: 'Europe', networks: ['Nova', 'Cosmote', 'Vodafone'], vpmn: 'GRCSH', rate: 0.0009 },
  { name: 'Hungary', code: 'HU', region: 'Europe', networks: ['T-Mobile', 'Yettel', 'Vodafone'], vpmn: 'HUNH2', rate: 0.0008 },
  { name: 'Iceland', code: 'IS', region: 'Europe', networks: ['Vodafone', 'Nova'], vpmn: 'ISLTL', rate: 0.0013 },
  { name: 'Ireland', code: 'IE', region: 'Europe', networks: ['3', 'Eir', 'Vodafone'], vpmn: 'IRLH3', rate: 0.0009 },
  { name: 'Italy', code: 'IT', region: 'Europe', networks: ['Windtre', 'Vodafone', 'TIM'], vpmn: 'ITAWI', rate: 0.0009 },
  { name: 'Latvia', code: 'LV', region: 'Europe', networks: ['Bite', 'Tele2', 'LMT'], vpmn: 'LVABT', rate: 0.0009 },
  { name: 'Liechtenstein', code: 'LI', region: 'Europe', networks: ['Telecom FL', '7acht'], vpmn: 'LIEMK', rate: 0.0009 },
  { name: 'Lithuania', code: 'LT', region: 'Europe', networks: ['Bite', 'TELE2', 'Telia'], vpmn: 'LTUMT', rate: 0.0009 },
  { name: 'Luxembourg', code: 'LU', region: 'Europe', networks: ['Tango', 'Orange', 'Post'], vpmn: 'LUXTG', rate: 0.0008 },
  { name: 'Netherlands', code: 'NL', region: 'Europe', networks: ['KPN', 'Vodafone'], vpmn: 'NLDPT', rate: 0.0009 },
  { name: 'Norway', code: 'NO', region: 'Europe', networks: ['Telenor', 'Telia'], vpmn: 'NORTM', rate: 0.0009 },
  { name: 'Poland', code: 'PL', region: 'Europe', networks: ['Plus'], vpmn: 'POLKM', rate: 0.0013 },
  { name: 'Portugal', code: 'PT', region: 'Europe', networks: ['NOS', 'MEO', 'Vodafone'], vpmn: 'PRTOP', rate: 0.0009 },
  { name: 'Romania', code: 'RO', region: 'Europe', networks: ['Digi', 'T-Mobile', 'Orange', 'Vodafone'], vpmn: 'ROM05', rate: 0.0009 },
  { name: 'San Marino', code: 'SM', region: 'Europe', networks: ['Windtre', 'Vodafone'], vpmn: 'ITAWI', rate: 0.0009 },
  { name: 'Slovakia', code: 'SK', region: 'Europe', networks: ['T-Mobile', 'O2', 'Orange'], vpmn: 'SVKET', rate: 0.0009 },
  { name: 'Slovenia', code: 'SI', region: 'Europe', networks: ['Telemach', 'A1', 'Telekom'], vpmn: 'SVNVG', rate: 0.0009 },
  { name: 'Sweden', code: 'SE', region: 'Europe', networks: ['Telenor', '3', 'Tele2', 'Telia'], vpmn: 'SWEEP', rate: 0.0009 },
  { name: 'Switzerland', code: 'CH', region: 'Europe', networks: ['Sunrise', 'Salt'], vpmn: 'CHEDX', rate: 0.0011 },
  { name: 'United Kingdom', code: 'GB', region: 'Europe', networks: ['3', 'EE', 'O2', 'Vodafone'], vpmn: 'GBRHU', rate: 0.0009, popular: true },
  { name: 'Vatican City', code: 'VA', region: 'Europe', networks: ['Windtre', 'Vodafone', 'TIM'], vpmn: 'ITAWI', rate: 0.0009 },

  // ===== Americas (IoT-M) =====
  { name: 'United States', code: 'US', region: 'Americas', networks: ['AT&T', 'Verizon', 'T-Mobile'], vpmn: 'USACG', rate: 0.0014, popular: true },
  { name: 'Canada', code: 'CA', region: 'Americas', networks: ['Freedom', 'Telus', 'Bell', 'Rogers'], vpmn: 'CANK5', rate: 0.0026 },
  { name: 'Mexico', code: 'MX', region: 'Americas', networks: ['Movistar', 'AT&T'], vpmn: 'MEXMS', rate: 0.0048 },

  // ===== Africa =====
  { name: 'Algeria', code: 'DZ', region: 'Africa', networks: ['Djezzy'], vpmn: 'DZAOT', rate: 0.0015 },
];

export const MOCK_COUNTRIES: Country[] = RAW.map((c, i) => {
  const id = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const plans = makePlans(id, c.rate);
  return {
    id,
    name: c.name,
    flag: countryCodeToFlag(c.code),
    countryCode: c.code,
    region: c.region,
    startPrice: plans[0].price,
    networkCount: c.networks.length,
    networks: c.networks,
    vpmn: c.vpmn,
    vpn: true,
    plans,
    isPopular: c.popular ?? false,
  };
});

export const MOCK_PLANS_US: Plan[] = MOCK_COUNTRIES.find(c => c.countryCode === 'US')?.plans ?? [];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-123',
    countryName: 'Japan',
    flag: '🇯🇵',
    planName: 'Standard (3GB)',
    price: 18.99,
    status: 'ACTIVE',
    date: '2023-10-25',
    type: 'ESIM'
  }
];

export const CARRIER_MAP: Record<string, { carrier: string; network: string }> = {
  'US': { carrier: 'AT&T / T-Mobile', network: '5G' },
  'GB': { carrier: 'EE / 3', network: '5G' },
  'CA': { carrier: 'Freedom / Telus', network: '5G' },
  'JP': { carrier: 'KDDI / SoftBank', network: '4G/5G' },
  'MX': { carrier: 'Movistar / AT&T', network: '4G' },
  'DE': { carrier: 'O2 / Vodafone', network: '5G' },
  'FR': { carrier: 'Bouygues / Orange', network: '5G' },
  'CH': { carrier: 'Sunrise / Salt', network: '5G' },
  'TH': { carrier: 'AIS / dtac / True', network: '4G/5G' },
  'MY': { carrier: 'Celcom / Digi / Maxis', network: '5G' },
  'PH': { carrier: 'Globe / Smart', network: '5G' },
  'AU': { carrier: 'Optus', network: '5G' },
  'KR': { carrier: 'SK / LG U+ / KT', network: '5G' },
  'SG': { carrier: 'SingTel / StarHub', network: '5G' },
  'CN': { carrier: 'China Telecom / Unicom', network: '5G' },
  'IT': { carrier: 'Windtre / Vodafone', network: '5G' },
  'HK': { carrier: 'HKT / CSL', network: '5G' },
  'TW': { carrier: 'Chunghwa / FarEasTone', network: '5G' },
  'ID': { carrier: 'Telkomsel / Hutchison', network: '4G/5G' },
  'VN': { carrier: 'MobiFone / Viettel', network: '4G' },
  'NZ': { carrier: 'Spark / Vodafone', network: '5G' },
  'BE': { carrier: 'Proximus / BASE', network: '5G' },
  'NL': { carrier: 'KPN / Vodafone', network: '5G' },
  'SE': { carrier: 'Telenor / Telia', network: '5G' },
  'NO': { carrier: 'Telenor / Telia', network: '5G' },
  'DK': { carrier: 'TDC / Telenor', network: '5G' },
  'FI': { carrier: 'Elisa / DNA', network: '5G' },
  'AT': { carrier: '3 / A1', network: '5G' },
  'IE': { carrier: '3 / Vodafone', network: '5G' },
  'PT': { carrier: 'NOS / MEO', network: '5G' },
  'GR': { carrier: 'Nova / Cosmote', network: '5G' },
  'PL': { carrier: 'Plus', network: '5G' },
  'CZ': { carrier: 'T-Mobile / O2', network: '5G' },
  'HU': { carrier: 'T-Mobile / Yettel', network: '5G' },
  'RO': { carrier: 'Digi / Orange', network: '5G' },
  'BG': { carrier: 'Vivacom / A1', network: '4G/5G' },
  'HR': { carrier: 'Tele2 / A1', network: '4G/5G' },
  'SI': { carrier: 'Telemach / A1', network: '4G/5G' },
  'SK': { carrier: 'T-Mobile / O2', network: '5G' },
  'EE': { carrier: 'Elisa / Telia', network: '5G' },
  'LV': { carrier: 'Bite / Tele2', network: '4G/5G' },
  'LT': { carrier: 'Bite / Telia', network: '4G/5G' },
  'IS': { carrier: 'Vodafone / Nova', network: '4G' },
  'LU': { carrier: 'Tango / Orange', network: '5G' },
  'DZ': { carrier: 'Djezzy', network: '4G' },
  'KH': { carrier: 'Metfone', network: '4G' },
  'MO': { carrier: 'CTM', network: '5G' },
};

export const MOCK_ECARDS: ECard[] = [
  {
    id: 'EC-001',
    eid: '89852000263322188320001',
    cardType: 'E2',
    label: 'My Evair eCard',
    status: 'BOUND',
    boundDate: '2024-12-15T10:00:00Z',
    maxProfiles: 15,
    downloadCount: 3,
    maxDownloads: -1,
    profiles: [
      { id: 'EP-1', name: 'Japan Travel', country: MOCK_COUNTRIES.find(c => c.countryCode === 'JP')!, status: 'ACTIVE', dataUsedGB: 1.2, dataTotalGB: 5.0, daysLeft: 18 },
      { id: 'EP-2', name: 'US Data', country: MOCK_COUNTRIES.find(c => c.countryCode === 'US')!, status: 'INACTIVE', dataUsedGB: 0, dataTotalGB: 3.0, daysLeft: 30 },
      { id: 'EP-3', name: 'Thailand Holiday', country: MOCK_COUNTRIES.find(c => c.countryCode === 'TH')!, status: 'INACTIVE', dataUsedGB: 2.1, dataTotalGB: 10.0, daysLeft: 5 },
    ],
  },
  {
    id: 'EC-002',
    eid: '89852000417856239410002',
    cardType: 'E2',
    label: 'Travel eCard',
    status: 'BOUND',
    boundDate: '2025-01-20T14:00:00Z',
    maxProfiles: 15,
    downloadCount: 1,
    maxDownloads: -1,
    profiles: [
      { id: 'EP-4', name: 'UK Business', country: MOCK_COUNTRIES.find(c => c.countryCode === 'GB')!, status: 'ACTIVE', dataUsedGB: 0.8, dataTotalGB: 5.0, daysLeft: 22 },
    ],
  },
];

export const MOCK_ACTIVE_SIMS: ActiveSim[] = [
  // eSIMs
  { id: 'ESIM-8832', country: MOCK_COUNTRIES.find(c => c.countryCode === 'US')!, plan: MOCK_PLANS_US[2], type: 'ESIM', activationDate: '2023-11-01T10:00:00Z', expiryDate: '2024-01-01T10:00:00Z', dataTotalGB: 3.0, dataUsedGB: 0.5, status: 'ACTIVE' },
  { id: 'ESIM-9941', country: MOCK_COUNTRIES.find(c => c.countryCode === 'GB')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'GB')!.plans[1], type: 'ESIM', activationDate: '2023-11-10T14:30:00Z', expiryDate: '2024-01-10T14:30:00Z', dataTotalGB: 3.0, dataUsedGB: 2.8, status: 'ACTIVE' },
  { id: 'ESIM-5571', country: MOCK_COUNTRIES.find(c => c.countryCode === 'JP')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'JP')!.plans[2], type: 'ESIM', activationDate: '2023-12-01T08:00:00Z', expiryDate: '2024-02-01T08:00:00Z', dataTotalGB: 5.0, dataUsedGB: 1.2, status: 'ACTIVE' },
  { id: 'ESIM-7743', country: MOCK_COUNTRIES.find(c => c.countryCode === 'TH')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'TH')!.plans[3], type: 'ESIM', activationDate: '2024-01-01T10:00:00Z', expiryDate: '2024-02-01T10:00:00Z', dataTotalGB: 10.0, dataUsedGB: 4.2, status: 'ACTIVE' },
  // Physical SIMs
  { id: 'SIM-3301', country: MOCK_COUNTRIES.find(c => c.countryCode === 'US')!, plan: MOCK_PLANS_US[2], type: 'PHYSICAL', activationDate: '2024-10-15T09:00:00Z', expiryDate: '2025-04-15T09:00:00Z', dataTotalGB: 5.0, dataUsedGB: 1.8, status: 'ACTIVE' },
  { id: 'SIM-3302', country: MOCK_COUNTRIES.find(c => c.countryCode === 'GB')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'GB')!.plans[3], type: 'PHYSICAL', activationDate: '2024-11-01T12:00:00Z', expiryDate: '2025-05-01T12:00:00Z', dataTotalGB: 10.0, dataUsedGB: 3.5, status: 'ACTIVE' },
  { id: 'SIM-3303', country: MOCK_COUNTRIES.find(c => c.countryCode === 'JP')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'JP')!.plans[1], type: 'PHYSICAL', activationDate: '', expiryDate: '2025-06-01T08:00:00Z', dataTotalGB: 3.0, dataUsedGB: 0, status: 'PENDING_ACTIVATION' },
  { id: 'SIM-3304', country: MOCK_COUNTRIES.find(c => c.countryCode === 'DE')!, plan: MOCK_COUNTRIES.find(c => c.countryCode === 'DE')!.plans[2], type: 'PHYSICAL', activationDate: '2024-06-01T10:00:00Z', expiryDate: '2024-12-01T10:00:00Z', dataTotalGB: 5.0, dataUsedGB: 4.8, status: 'EXPIRED' },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'N-001',
    type: 'data_low',
    titleKey: 'inbox.data_low_title',
    bodyKey: 'inbox.data_low_body_gb',
    date: '2026-02-28T14:30:00Z',
    read: false,
    actionLabel: 'inbox.top_up_now',
    countryCode: 'GB',
  },
  {
    id: 'N-002',
    type: 'expiring',
    titleKey: 'inbox.expiring_title',
    bodyKey: 'inbox.expiring_body_th',
    date: '2026-02-27T09:00:00Z',
    read: false,
    actionLabel: 'inbox.renew_plan',
    countryCode: 'TH',
  },
  {
    id: 'N-003',
    type: 'order',
    titleKey: 'inbox.order_ready_title',
    bodyKey: 'inbox.order_ready_body',
    date: '2026-02-26T16:45:00Z',
    read: true,
    actionLabel: 'inbox.install_now',
    countryCode: 'JP',
  },
  {
    id: 'N-004',
    type: 'promo',
    titleKey: 'inbox.promo_title',
    bodyKey: 'inbox.promo_body',
    date: '2026-02-25T10:00:00Z',
    read: true,
    actionLabel: 'inbox.shop_now',
  },
  {
    id: 'N-005',
    type: 'service',
    titleKey: 'inbox.service_title',
    bodyKey: 'inbox.service_body',
    date: '2026-02-24T08:00:00Z',
    read: true,
  },
  {
    id: 'N-006',
    type: 'data_low',
    titleKey: 'inbox.data_low_title',
    bodyKey: 'inbox.data_low_body_us',
    date: '2026-02-23T11:20:00Z',
    read: true,
    actionLabel: 'inbox.top_up_now',
    countryCode: 'US',
  },
];
