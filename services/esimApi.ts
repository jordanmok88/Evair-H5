import type {
  EsimApiResponse,
  EsimPackage,
  PackageListPayload,
  EsimOrderRequest,
  EsimOrderRawResult,
  EsimOrderResult,
  EsimQueryPayload,
  EsimProfileResult,
  DataUsageResult,
  TopUpRequest,
  TopUpResult,
  EsimCountryGroup,
} from '../types';

const PROXY_URL = '/api/esim';

/**
 * Pre-launch demo mode: when true, order and top-up calls return
 * simulated success without hitting the supplier API.
 * Browsing packages / checking usage still works against the real API.
 * Flip to `false` when ready to go live.
 */
export const DEMO_MODE = true;

async function call<T>(endpoint: string, payload: Record<string, unknown> = {}): Promise<EsimApiResponse<T>> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eSIM API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<EsimApiResponse<T>>;
}

// ─── Package List (with localStorage cache) ─────────────────────────

const CACHE_KEY = 'evair_esim_packages';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PackageCache {
  ts: number;
  data: EsimPackage[];
}

function getCachedPackages(): EsimPackage[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: PackageCache = JSON.parse(raw);
    if (Date.now() - cache.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
}

function setCachedPackages(data: EsimPackage[]) {
  try {
    const cache: PackageCache = { ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full — ignore */ }
}

export interface FetchPackagesParams {
  locationCode?: string;
  type?: 'BASE' | 'TOPUP';
  packageCode?: string;
  iccid?: string;
}

let _prefetchPromise: Promise<EsimPackage[]> | null = null;

export function prefetchPackages() {
  if (!_prefetchPromise) {
    _prefetchPromise = fetchPackages();
  }
  return _prefetchPromise;
}

export async function fetchPackages(params: FetchPackagesParams = {}): Promise<EsimPackage[]> {
  const isFullList = !params.locationCode && !params.type && !params.packageCode && !params.iccid;

  if (isFullList) {
    const cached = getCachedPackages();
    if (cached) return cached;
  }

  const resp = await call<PackageListPayload>('/package/list', {
    locationCode: params.locationCode ?? '',
    type: params.type ?? '',
    packageCode: params.packageCode ?? '',
    iccid: params.iccid ?? '',
  });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Failed to fetch packages');
  }

  const packages = resp.obj?.packageList ?? [];

  if (isFullList) {
    setCachedPackages(packages);
  }

  return packages;
}

export async function fetchTopUpPackages(iccid: string): Promise<EsimPackage[]> {
  return fetchPackages({ type: 'TOPUP', iccid });
}

// ─── Order eSIM ──────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function orderEsim(req: EsimOrderRequest): Promise<EsimOrderResult> {
  if (DEMO_MODE) {
    await delay(1500);
    const fakeOrder = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const fakeIccid = `8985200${Math.floor(Math.random() * 1e13).toString().padStart(13, '0')}`;
    return {
      orderNo: fakeOrder,
      transactionId: req.transactionId,
      iccid: fakeIccid,
      smdpAddress: 'demo.rsp.evairsim.com',
      activationCode: 'DEMO-XXXX-XXXX',
      qrCodeUrl: '',
      shortUrl: '',
      lpaString: `LPA:1$demo.rsp.evairsim.com$DEMO-XXXX-XXXX`,
    };
  }

  const resp = await call<EsimOrderRawResult>('/esim/order', {
    transactionId: req.transactionId,
    packageInfoList: [{
      packageCode: req.packageCode,
      count: req.count ?? 1,
      price: req.amount,
    }],
  });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Order failed');
  }

  const { orderNo, transactionId } = resp.obj;

  const maxAttempts = 8;
  for (let i = 0; i < maxAttempts; i++) {
    await delay(i === 0 ? 2000 : 3000);

    const queryResp = await call<EsimQueryPayload>('/esim/query', {
      orderNo,
      pager: { pageNum: 1, pageSize: 20 },
    });

    if (queryResp.success && queryResp.obj?.esimList?.length > 0) {
      const esim = queryResp.obj.esimList[0];

      let smdpAddress = '';
      let activationCode = '';
      if (esim.ac?.startsWith('LPA:')) {
        const parts = esim.ac.split('$');
        smdpAddress = parts[1] ?? '';
        activationCode = parts[2] ?? '';
      }

      return {
        orderNo,
        transactionId,
        iccid: esim.iccid || esim.esimTranNo,
        smdpAddress,
        activationCode,
        qrCodeUrl: esim.qrCodeUrl || '',
        shortUrl: esim.shortUrl || '',
        lpaString: esim.ac || `LPA:1$${smdpAddress}$${activationCode}`,
      };
    }
  }

  throw new Error('Order placed (ref: ' + orderNo + ') but eSIM is still being prepared. Check your dashboard.');
}

// ─── Query Profile ───────────────────────────────────────────────────

export async function queryProfile(iccid: string): Promise<EsimProfileResult> {
  const resp = await call<EsimQueryPayload>('/esim/query', {
    iccid,
    pager: { pageNum: 1, pageSize: 20 },
  });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Profile query failed');
  }

  const list = resp.obj?.esimList;
  if (!list || list.length === 0) {
    throw new Error('This ICCID was not found. Please check the number and try again.');
  }

  const esim = list[0];
  return {
    iccid: esim.iccid,
    packageCode: esim.packageCode || '',
    status: esim.smdpStatus || '',
    expiredTime: esim.expiredTime || '',
    totalVolume: esim.totalVolume || 0,
    usedVolume: esim.usedVolume || 0,
  };
}

// ─── Data Usage ──────────────────────────────────────────────────────

export async function checkDataUsage(iccid: string): Promise<DataUsageResult> {
  const resp = await call<DataUsageResult>('/esim/usage', { iccid });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Data usage check failed');
  }

  return resp.obj;
}

// ─── Top Up ──────────────────────────────────────────────────────────

export async function topUp(req: TopUpRequest): Promise<TopUpResult> {
  if (DEMO_MODE) {
    await delay(1000);
    return {
      orderNo: `DEMO-TOPUP-${Date.now().toString(36).toUpperCase()}`,
      transactionId: req.transactionId,
    } as TopUpResult;
  }

  const resp = await call<TopUpResult>('/esim/topup', {
    iccid: req.iccid,
    packageCode: req.packageCode,
    transactionId: req.transactionId,
    amount: req.amount,
  });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Top-up failed');
  }

  return resp.obj;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function resolveLocationName(location: string): string {
  const codes = location.split(',').map(c => c.trim());
  if (codes.length === 1) {
    return countryName(codes[0]);
  }
  if (codes.length <= 3) {
    return codes.map(c => countryName(c)).join(', ');
  }
  return `${countryName(codes[0])} +${codes.length - 1} countries`;
}

const CONTINENT_MAP: Record<string, string> = {
  AF:'Asia',BD:'Asia',BH:'Asia',BN:'Asia',BT:'Asia',CN:'Asia',GE:'Asia',HK:'Asia',
  ID:'Asia',IL:'Asia',IN:'Asia',IQ:'Asia',IR:'Asia',JO:'Asia',JP:'Asia',KG:'Asia',
  KH:'Asia',KR:'Asia',KW:'Asia',KZ:'Asia',LA:'Asia',LB:'Asia',LK:'Asia',MM:'Asia',
  MN:'Asia',MO:'Asia',MV:'Asia',MY:'Asia',NP:'Asia',OM:'Asia',PH:'Asia',PK:'Asia',
  PS:'Asia',QA:'Asia',SA:'Asia',SG:'Asia',SY:'Asia',TH:'Asia',TJ:'Asia',TL:'Asia',
  TM:'Asia',TR:'Asia',TW:'Asia',UZ:'Asia',VN:'Asia',YE:'Asia',AE:'Asia',AM:'Asia',AZ:'Asia',CY:'Asia',
  AL:'Europe',AD:'Europe',AT:'Europe',BA:'Europe',BE:'Europe',BG:'Europe',BY:'Europe',
  CH:'Europe',CZ:'Europe',DE:'Europe',DK:'Europe',EE:'Europe',ES:'Europe',FI:'Europe',
  FO:'Europe',FR:'Europe',GB:'Europe',GG:'Europe',GI:'Europe',GR:'Europe',HR:'Europe',
  HU:'Europe',IE:'Europe',IM:'Europe',IS:'Europe',IT:'Europe',JE:'Europe',LI:'Europe',
  LT:'Europe',LU:'Europe',LV:'Europe',MC:'Europe',MD:'Europe',ME:'Europe',MK:'Europe',
  MT:'Europe',NL:'Europe',NO:'Europe',PL:'Europe',PT:'Europe',RO:'Europe',RS:'Europe',
  RU:'Europe',SE:'Europe',SI:'Europe',SK:'Europe',SM:'Europe',UA:'Europe',VA:'Europe',XK:'Europe',
  AG:'Americas',AI:'Americas',AR:'Americas',AW:'Americas',BB:'Americas',BM:'Americas',
  BO:'Americas',BR:'Americas',BS:'Americas',BZ:'Americas',CA:'Americas',CL:'Americas',
  CO:'Americas',CR:'Americas',CU:'Americas',CW:'Americas',DM:'Americas',DO:'Americas',
  EC:'Americas',GD:'Americas',GT:'Americas',GY:'Americas',HN:'Americas',HT:'Americas',
  JM:'Americas',KN:'Americas',KY:'Americas',LC:'Americas',MX:'Americas',NI:'Americas',
  PA:'Americas',PE:'Americas',PR:'Americas',PY:'Americas',SR:'Americas',SV:'Americas',
  TC:'Americas',TT:'Americas',US:'Americas',UY:'Americas',VC:'Americas',VE:'Americas',VG:'Americas',VI:'Americas',SX:'Americas',MQ:'Americas',GP:'Americas',GF:'Americas',FK:'Americas',
  AU:'Oceania',FJ:'Oceania',NZ:'Oceania',PG:'Oceania',WS:'Oceania',TO:'Oceania',VU:'Oceania',SB:'Oceania',PF:'Oceania',NC:'Oceania',GU:'Oceania',
  DZ:'Africa',AO:'Africa',BF:'Africa',BI:'Africa',BJ:'Africa',BW:'Africa',CD:'Africa',
  CF:'Africa',CG:'Africa',CI:'Africa',CM:'Africa',CV:'Africa',DJ:'Africa',EG:'Africa',
  ER:'Africa',ET:'Africa',GA:'Africa',GH:'Africa',GM:'Africa',GN:'Africa',GQ:'Africa',
  GW:'Africa',KE:'Africa',KM:'Africa',LR:'Africa',LS:'Africa',LY:'Africa',MA:'Africa',
  MG:'Africa',ML:'Africa',MR:'Africa',MU:'Africa',MW:'Africa',MZ:'Africa',NA:'Africa',
  NE:'Africa',NG:'Africa',RE:'Africa',RW:'Africa',SC:'Africa',SD:'Africa',SL:'Africa',
  SN:'Africa',SO:'Africa',SS:'Africa',ST:'Africa',SZ:'Africa',TD:'Africa',TG:'Africa',
  TN:'Africa',TZ:'Africa',UG:'Africa',ZA:'Africa',ZM:'Africa',ZW:'Africa',
};

function getContinent(code: string): string {
  return CONTINENT_MAP[code.toUpperCase()] ?? 'Other';
}

export const POPULAR_COUNTRY_CODES = ['JP', 'US', 'TH', 'KR', 'AU', 'SG', 'GB', 'FR'];

export function groupPackagesByLocation(packages: EsimPackage[]): EsimCountryGroup[] {
  const map = new Map<string, EsimPackage[]>();

  for (const pkg of packages) {
    const key = pkg.location;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(pkg);
  }

  const groups: EsimCountryGroup[] = [];
  for (const [loc, pkgs] of map.entries()) {
    const primaryCode = loc.split(',')[0].trim();
    const isMultiRegion = loc.includes(',');
    groups.push({
      locationCode: loc,
      locationName: resolveLocationName(loc),
      flag: primaryCode,
      packages: pkgs.sort((a, b) => a.volume - b.volume),
      continent: isMultiRegion ? 'Multi-Region' : getContinent(primaryCode),
      isMultiRegion,
    });
  }

  groups.sort((a, b) => a.locationName.localeCompare(b.locationName));
  return groups;
}

export function getPopularGroups(groups: EsimCountryGroup[]): EsimCountryGroup[] {
  const result: EsimCountryGroup[] = [];
  for (const code of POPULAR_COUNTRY_CODES) {
    const g = groups.find(g => !g.isMultiRegion && g.locationCode.toUpperCase() === code);
    if (g) result.push(g);
  }
  return result;
}

export const CONTINENT_TABS = ['All', 'Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Multi-Region'] as const;
export type ContinentTab = (typeof CONTINENT_TABS)[number];

export function formatVolume(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function formatPrice(microCents: number): number {
  return microCents / 10000;
}

/** 100% markup rounded to .99 retail price */
export function retailPrice(microCents: number): number {
  const cost = microCents / 10000;
  const marked = cost * 2;
  return Math.ceil(marked) - 0.01;
}
