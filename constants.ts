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
  'MX': { carrier: 'Telcel / Movistar / AT&T', network: '4G/5G' },
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
  'IN': { carrier: 'Jio / Airtel / Vi', network: '5G' },
  'VN': { carrier: 'MobiFone / Viettel / Vinaphone', network: '4G/5G' },
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

  /** Expanded retail hints — aligns with typical global eSIM coverage until API snapshot/backend wins. */
  'AD': { carrier: 'Andorra Telecom', network: '4G/5G' },
  'AE': { carrier: 'Etisalat / du', network: '5G' },
  'AF': { carrier: 'Roshan / MTN', network: '4G' },
  'AG': { carrier: 'Flow / Digicel', network: '4G' },
  'AL': { carrier: 'One / Vodafone / ALBtelecom', network: '4G' },
  'AM': { carrier: 'Team / Viva-MTS', network: '4G' },
  'AO': { carrier: 'UNITEL / Movitel', network: '4G' },
  'AR': { carrier: 'Personal / Movistar / Claro', network: '4G/5G' },
  'AZ': { carrier: 'Azercell / Bakcell', network: '4G/5G' },
  'BA': { carrier: 'm:tel / HT Eronet', network: '4G' },
  'BD': { carrier: 'Grameenphone / Robi / Banglalink', network: '4G' },
  'BF': { carrier: 'Orange / Moov', network: '4G' },
  'BH': { carrier: 'Batelco / Zain', network: '5G' },
  'BI': { carrier: 'Orange / Lumitel', network: '4G' },
  'BJ': { carrier: 'Moov / MTN', network: '4G' },
  'BO': { carrier: 'Entel / Tigo / Viva', network: '4G' },
  'BR': { carrier: 'Vivo / Claro / TIM', network: '4G/5G' },
  'BS': { carrier: 'BTC / Aliv', network: '4G' },
  'BT': { carrier: 'TashiCell / B-Mobile', network: '4G' },
  'BW': { carrier: 'Mascom / Orange', network: '4G' },
  'BY': { carrier: 'A1 / life:)', network: '4G' },
  'BZ': { carrier: 'Digicell / SMART', network: '4G' },
  'CD': { carrier: 'Vodacom / Orange / Airtel', network: '4G' },
  'CF': { carrier: 'Orange / MOOV', network: '4G' },
  'CG': { carrier: 'MTN / Airtel', network: '4G' },
  'CI': { carrier: 'Orange / MTN / Moov', network: '4G' },
  'CL': { carrier: 'Entel / Movistar / WOM', network: '5G' },
  'CM': { carrier: 'MTN / Orange / Nexttel', network: '4G' },
  'CO': { carrier: 'Claro / Movistar / Tigo', network: '4G/5G' },
  'CR': { carrier: 'Kolbi / Claro / Movistar', network: '4G' },
  'CV': { carrier: 'CVMóvel', network: '4G' },
  'CY': { carrier: 'Cyta / Epic / PrimeTel', network: '5G' },
  'DJ': { carrier: 'Djibouti Telecom', network: '4G' },
  'DM': { carrier: 'Digicel / FLOW', network: '4G' },
  'DO': { carrier: 'Altice / Claro / Orange', network: '4G' },
  'EC': { carrier: 'Claro / Movistar / CNT', network: '4G' },
  'EG': { carrier: 'Orange / Vodafone / Etisalat / WE', network: '4G' },
  'ES': { carrier: 'Movistar / Vodafone / Orange', network: '5G' },
  'ET': { carrier: 'Ethio Telecom', network: '4G' },
  'FJ': { carrier: 'Digicel / Vodafone', network: '4G' },
  'GA': { carrier: 'Airtel / Moov', network: '4G' },
  'GE': { carrier: 'Magticom / Beeline', network: '4G/5G' },
  'GF': { carrier: 'Orange / Digicel', network: '4G' },
  'GH': { carrier: 'MTN / Vodafone', network: '4G' },
  'GM': { carrier: 'Gamcell / Africell', network: '4G' },
  'GN': { carrier: 'Orange / MTN', network: '4G' },
  'GP': { carrier: 'Orange / Digicel', network: '4G' },
  'GQ': { carrier: 'Muni / HiTs', network: '4G' },
  'GT': { carrier: 'Claro / Movistar / Tigo', network: '4G' },
  'GW': { carrier: 'Orange / MTN', network: '4G' },
  'GY': { carrier: 'Guyana Telephone / Digicel', network: '4G' },
  'HN': { carrier: 'Tigo / Claro', network: '4G' },
  'IL': { carrier: 'Cellcom / Partner / Pelephone', network: '5G' },
  'IQ': { carrier: 'AsiaCell / Korek / Zain', network: '4G' },
  'JM': { carrier: 'Digicel / FLOW', network: '4G' },
  'JO': { carrier: 'Zain / Orange / Umniah', network: '4G' },
  'KE': { carrier: 'Safaricom / Airtel', network: '4G/5G' },
  'KG': { carrier: 'Beeline / Megacom / O!', network: '4G' },
  'KM': { carrier: 'Comores Telecom / Huri', network: '4G' },
  'KN': { carrier: 'FLOW / Digicel', network: '4G' },
  'KW': { carrier: 'stc / Ooredoo / Zain', network: '5G' },
  'KY': { carrier: 'FLOW / Digicel', network: '4G' },
  'KZ': { carrier: 'Kcell / Beeline / Tele2', network: '4G/5G' },
  'LA': { carrier: 'Lao Telecom / Unitel', network: '4G' },
  'LB': { carrier: 'Alfa / touch', network: '4G' },
  'LC': { carrier: 'Digicel / FLOW', network: '4G' },
  'LK': { carrier: 'Dialog / Mobitel', network: '4G' },
  'LR': { carrier: 'Lonestar / Orange', network: '4G' },
  'LS': { carrier: 'Vodacom / Econet', network: '4G' },
  'LY': { carrier: 'Libyana / Almadar', network: '4G' },
  'MA': { carrier: 'IAM / Orange / INWI', network: '4G' },
  'MC': { carrier: 'Monaco Telecom / Orange', network: '5G' },
  'MD': { carrier: 'Orange / Moldcell / Unite', network: '4G' },
  'ME': { carrier: 'Telekom / Telenor', network: '4G/5G' },
  'MG': { carrier: 'Telma / Orange / Airtel', network: '4G' },
  'MK': { carrier: 'A1 / Telecom / Lycom', network: '4G' },
  'ML': { carrier: 'Orange / Malitel', network: '4G' },
  'MM': { carrier: 'MPT / Atom / Mytel', network: '4G' },
  'MN': { carrier: 'Mobicom / Skytel / Unitel', network: '4G' },
  'MQ': { carrier: 'Orange / Digicel', network: '4G' },
  'MR': { carrier: 'Chinguitel / Mattel', network: '4G' },
  'MT': { carrier: 'Epic / GO / Melita', network: '5G' },
  'MU': { carrier: 'my.t / Cellplus / EMTEL', network: '4G' },
  'MV': { carrier: 'Dhiraagu / Ooredoo', network: '4G' },
  'MW': { carrier: 'Airtel / TNM', network: '4G' },
  'MZ': { carrier: 'Vodacom / Movitel', network: '4G' },
  'NA': { carrier: 'MTC / Telecom Namibia', network: '4G' },
  'NE': { carrier: 'Airtel / Moov', network: '4G' },
  'NG': { carrier: 'MTN / Airtel / Glo', network: '4G' },
  'NI': { carrier: 'Claro / Movistar', network: '4G' },
  'NP': { carrier: 'Ncell / Nepal Telecom', network: '4G' },
  'OM': { carrier: 'Omantel / Ooredoo', network: '5G' },
  'PA': { carrier: 'Tigo / Claro / +Móvil', network: '4G' },
  'PE': { carrier: 'Claro / Movistar / Entel', network: '4G/5G' },
  'PK': { carrier: 'Jazz / Zong / Ufone', network: '4G' },
  'PR': { carrier: 'Claro / Liberty', network: '4G' },
  'PS': { carrier: 'Jawwal / Ooredoo', network: '4G' },
  'PY': { carrier: 'Tigo / Personal / Claro', network: '4G' },
  'QA': { carrier: 'Ooredoo / Vodafone', network: '5G' },
  'RE': { carrier: 'Orange / SFR / Free', network: '5G' },
  'RW': { carrier: 'MTN / Airtel', network: '4G' },
  'SA': { carrier: 'STC / Mobily / Zain', network: '5G' },
  'SB': { carrier: 'Solomon Telecom / Our Telekom', network: '4G' },
  'SC': { carrier: 'Airtel / Cable & Wireless', network: '4G' },
  'SD': { carrier: 'Sudani / MTN', network: '4G' },
  'SN': { carrier: 'Orange / Free / Expresso', network: '4G' },
  'SR': { carrier: 'Digicel / Telesur', network: '4G' },
  'SV': { carrier: 'Claro / Movistar / Tigo', network: '4G' },
  'SZ': { carrier: 'MTN / Eswatini Mobile', network: '4G' },
  'TC': { carrier: 'Digicel / FLOW', network: '4G' },
  'TD': { carrier: 'Airtel / Salaam', network: '4G' },
  'TG': { carrier: 'Moov / Togo Cellulaire', network: '4G' },
  'TJ': { carrier: 'MegaFon / Tcell / ZET-Mobile', network: '4G' },
  'TM': { carrier: 'TmCell', network: '4G' },
  'TN': { carrier: 'Tunisie Telecom / Orange / Ooredoo', network: '4G' },
  'TR': { carrier: 'Turkcell / Vodafone / Türk Telekom', network: '4G/5G' },
  'TT': { carrier: 'Digicel / bmobile', network: '4G' },
  'TZ': { carrier: 'Vodacom / Airtel / Tigo', network: '4G' },
  'UA': { carrier: 'Kyivstar / Vodafone', network: '4G/5G' },
  'UG': { carrier: 'MTN / Airtel', network: '4G' },
  'UY': { carrier: 'Antel / Movistar / Claro', network: '4G' },
  'UZ': { carrier: 'Ucell / Beeline / UMS', network: '4G' },
  'VC': { carrier: 'FLOW / Digicel', network: '4G' },
  'VE': { carrier: 'Movistar / Digitel', network: '4G' },
  'VG': { carrier: 'FLOW / Digicel', network: '4G' },
  'VU': { carrier: 'Digicel / Vodafone', network: '4G' },
  'WS': { carrier: 'Digicel / Vodafone', network: '4G' },
  'XK': { carrier: 'Telekom / Vala / Ipko', network: '4G' },
  'YE': { carrier: 'Yemen Mobile / Yemen Telecom', network: '4G' },
  'YT': { carrier: 'Orange / Only', network: '4G' },
  'ZA': { carrier: 'Vodacom / MTN / Cell C', network: '5G' },
  'ZM': { carrier: 'Airtel / MTN / Zamtel', network: '4G' },
  'ZW': { carrier: 'Econet / NetOne / Telecel', network: '4G' },
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
