import { Country, Plan, Order, ActiveSim, ECard, AppNotification, SimCardProduct } from './types';

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

// Only USA available — plans from uploaded catalog (SIM_CARD_PRODUCTS for physical; country plans for eSIM)
const RAW: RawCountry[] = [
  { name: 'United States', code: 'US', region: 'Americas', networks: ['AT&T', 'Verizon', 'T-Mobile'], vpmn: 'USACG', rate: 0.0014, popular: true },
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

/** Physical SIM card products from catalog (New Cards.xlsx) sorted by GB */
export const SIM_CARD_PRODUCTS: SimCardProduct[] = [
  { id: 'US_3_30',  slug: 'US_3_30',  region: 'United States', coverage: 'US', sellingPrice: 8.99,  gbs: 3,  validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'PKY3WHPRZ' },
  { id: 'US_5_30',  slug: 'US_5_30',  region: 'United States', coverage: 'US', sellingPrice: 9.99,  gbs: 5,  validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'PKJNMJIIU' },
  { id: 'US_10_30', slug: 'US_10_30', region: 'United States', coverage: 'US', sellingPrice: 15.99, gbs: 10, validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'PCRKRUHIL' },
  { id: 'US_12_180',slug: 'US_12_180',region: 'United States', coverage: 'US', sellingPrice: 23.99, gbs: 12, validityDays: 180, speed: '3G/4G/5G', topUpType: 'Non-reloadable', productId: 'PICWP3TVY' },
  { id: 'US_15_30', slug: 'US_15_30', region: 'United States', coverage: 'US', sellingPrice: 21.99, gbs: 15, validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'P7QQR3WW0' },
  { id: 'US_20_30', slug: 'US_20_30', region: 'United States', coverage: 'US', sellingPrice: 27.99, gbs: 20, validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'CKH533' },
  { id: 'US_50_30', slug: 'US_50_30', region: 'United States', coverage: 'US', sellingPrice: 44.99, gbs: 50, validityDays: 30,  speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'PCR902VVL' },
  { id: 'US_50_180',slug: 'US_50_180',region: 'United States', coverage: 'US', sellingPrice: 74.99, gbs: 50, validityDays: 180, speed: '3G/4G/5G', topUpType: 'Data Reloadable for same area within validitity', productId: 'P3ICIKSE8' },
];

/**
 * Physical SIM purchase: points to Amazon (storefront URL or search).
 * Set `VITE_AMAZON_SIM_STOREFRONT_URL` when a flagship store is live;
 * default is Amazon.com search for “EvairSIM”.
 */
export const AMAZON_SIM_STOREFRONT_URL =
  (import.meta.env.VITE_AMAZON_SIM_STOREFRONT_URL as string | undefined) ||
  'https://www.amazon.com/s?k=EvairSIM';

/** Canonical Amazon PDP — marketing “Pick a plan” buttons + `/sim/*` tier CTAs (physical SIM checkout via Amazon for now). */
export const AMAZON_SIM_PRIMARY_PRODUCT_URL = 'https://www.amazon.com/dp/B0GZ2BVB1F';

/** Shown on marketing, legal, and error surfaces — must match canonical support inbox. */
export const CUSTOMER_SERVICE_EMAIL = 'service@evairdigital.com';

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
  'US': { carrier: 'AT&T / Verizon / T-Mobile', network: '5G' },
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

const US_COUNTRY = MOCK_COUNTRIES.find(c => c.countryCode === 'US')!;

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
      { id: 'EP-1', name: 'US Data', country: US_COUNTRY, status: 'ACTIVE', dataUsedGB: 1.2, dataTotalGB: 5.0, daysLeft: 18 },
      { id: 'EP-2', name: 'US Backup', country: US_COUNTRY, status: 'INACTIVE', dataUsedGB: 0, dataTotalGB: 3.0, daysLeft: 30 },
    ],
  },
];

export const MOCK_ACTIVE_SIMS: ActiveSim[] = [];

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'N-001',
    type: 'data_low',
    titleKey: 'inbox.data_low_title',
    bodyKey: 'inbox.data_low_body_auto',
    date: hoursAgo(2),
    read: false,
    actionLabel: 'inbox.top_up_now',
    countryCode: 'US',
    planName: '0.2 GB / 1.0 GB',
  },
  {
    id: 'N-002',
    type: 'expiring',
    titleKey: 'inbox.expiring_title',
    bodyKey: 'inbox.expiring_body_auto',
    date: hoursAgo(18),
    read: false,
    actionLabel: 'inbox.renew_plan',
    countryCode: 'JP',
    planName: '3',
  },
  {
    id: 'N-003',
    type: 'order',
    titleKey: 'inbox.esim_order_title',
    bodyKey: 'inbox.esim_order_body',
    date: hoursAgo(48),
    read: true,
    actionLabel: 'inbox.install_now',
    countryCode: 'TH',
    planName: 'Thailand 3GB/15Days',
    orderNo: 'ORD-20260307-8832',
  },
  {
    id: 'N-004',
    type: 'promo',
    titleKey: 'inbox.promo_title',
    bodyKey: 'inbox.promo_body',
    date: hoursAgo(120),
    read: true,
    actionLabel: 'inbox.shop_now',
  },
  {
    id: 'N-005',
    type: 'service',
    titleKey: 'inbox.service_title',
    bodyKey: 'inbox.service_body',
    date: hoursAgo(168),
    read: true,
  },
];
