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
 * China-team Laravel backstage. Owns catalogue, pricing, hidden plans,
 * country-name overrides — everything the sales team can edit in their
 * admin panel. The H5 client reads from here so what customers see matches
 * what the team curates.
 *
 * Order/payment/provisioning still flow through Stripe + Red Tea direct;
 * see Option B in `docs/CONVERSATION_HISTORY.md` for the full migration.
 */
/**
 * Override via `.env.local` → `VITE_BACKSTAGE_BASE_URL=...` when you want
 * the H5 dev build to hit a local `php artisan serve` (e.g. for testing
 * the catalogue filter fix before deploying). Use the Vite proxy alias
 * `/laravel-api/v1/h5` if you want to dodge CORS during local dev.
 */
const BACKSTAGE_BASE: string = (
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_BACKSTAGE_BASE_URL ?? 'https://evair.zhhwxt.cn/api/v1/h5'
);

/**
 * Feature flag — read packages from the backstage catalogue. Defaults true
 * because the team wants to drive sales from their admin panel. Set
 * `VITE_USE_BACKSTAGE_CATALOG=false` in `.env.local` to fall back to
 * direct Red Tea fetches (handy if the backstage is offline).
 */
export const USE_BACKSTAGE_CATALOG: boolean =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_USE_BACKSTAGE_CATALOG ?? 'true').toLowerCase() !== 'false';

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

const CACHE_KEY_LEGACY = 'evair_esim_packages';
// Bumped the cache key suffix ("v2") when the mapper started reading
// `locations[]` / `is_multi_country`. Without the bump, returning users
// would keep seeing the old single-ISO payload from cache and the
// Multi-Country tab would stay empty.
const CACHE_KEY_BACKSTAGE = 'evair_esim_packages_backstage_v2';
const CACHE_KEY_BACKSTAGE_LEGACY = 'evair_esim_packages_backstage';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — team may update prices daily

interface PackageCache {
  ts: number;
  data: EsimPackage[];
}

function activeCacheKey(): string {
  return USE_BACKSTAGE_CATALOG ? CACHE_KEY_BACKSTAGE : CACHE_KEY_LEGACY;
}

// One-time cleanup of the old Red Tea cache when the backstage flag is on.
// Without this, returning users would see stale (and now incorrectly priced)
// data from the legacy cache for up to 30 minutes after the flip.
if (typeof window !== 'undefined' && USE_BACKSTAGE_CATALOG) {
  try { localStorage.removeItem(CACHE_KEY_LEGACY); } catch { /* ignore */ }
  try { localStorage.removeItem(CACHE_KEY_BACKSTAGE_LEGACY); } catch { /* ignore */ }
}

function getCachedPackages(): EsimPackage[] | null {
  try {
    const raw = localStorage.getItem(activeCacheKey());
    if (!raw) return null;
    const cache: PackageCache = JSON.parse(raw);
    if (Date.now() - cache.ts > CACHE_TTL_MS) {
      localStorage.removeItem(activeCacheKey());
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
    localStorage.setItem(activeCacheKey(), JSON.stringify(cache));
  } catch { /* storage full — ignore */ }
}

export interface FetchPackagesParams {
  locationCode?: string;
  type?: 'BASE' | 'TOPUP';
  packageCode?: string;
  iccid?: string;
}

let _prefetchPromise: Promise<EsimPackage[]> | null = null;
let _prefetchTimestamp = 0;

export function prefetchPackages() {
  const now = Date.now();
  if (!_prefetchPromise || (now - _prefetchTimestamp > CACHE_TTL_MS)) {
    _prefetchTimestamp = now;
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

  const packages = USE_BACKSTAGE_CATALOG
    ? await fetchPackagesFromBackstage(params)
    : await fetchPackagesFromRedTea(params);

  if (isFullList) {
    setCachedPackages(packages);
  }

  return packages;
}

/** Legacy path — direct Red Tea via Netlify proxy. Kept for fallback. */
async function fetchPackagesFromRedTea(
  params: FetchPackagesParams,
): Promise<EsimPackage[]> {
  const resp = await call<PackageListPayload>('/package/list', {
    locationCode: params.locationCode ?? '',
    type: params.type ?? '',
    packageCode: params.packageCode ?? '',
    iccid: params.iccid ?? '',
  });

  if (!resp.success) {
    throw new Error(resp.errorMsg ?? 'Failed to fetch packages');
  }

  return resp.obj?.packageList ?? [];
}

/**
 * China-team backstage catalogue. Maps the Laravel `{code,msg,data}` envelope
 * + snake_case fields to our `EsimPackage` shape. Prices arrive as USD floats
 * (already retail), so we multiply by 10 000 to fit the micro-cents convention
 * the rest of the app speaks, and stamp `priceIsRetail: true` so the markup
 * helper knows to skip the legacy 2× wholesale-→-retail math.
 */
interface BackstagePackagesEnvelope {
  code: number;
  msg: string;
  data?: {
    packages?: BackstagePackageRow[];
    total?: number;
  };
}
interface BackstagePackageRow {
  package_code: string;
  name: string;
  price: number;            // USD float, already retail
  currency?: string;
  volume: number;           // bytes
  duration: number;
  duration_unit: string;    // 'DAY' | 'MONTH'
  location?: string | null; // primary ISO code (back-compat)
  location_name?: string | null;
  /**
   * Full ISO-2 coverage list. Single-country plans have length 1; regional
   * plans have 2+ (e.g. ["US","CA","MX"] for NA-3); global carry 100+.
   * Added when the Laravel catalogue was taught to distinguish strict single
   * vs. multi-country. When absent (older backend), we fall back to `location`.
   */
  locations?: string[] | null;
  is_multi_country?: boolean;
  type?: string;            // 'BASE' | 'TOPUP'
  speed?: string;
  features?: string[];
  description?: string | null;
}

async function fetchPackagesFromBackstage(
  params: FetchPackagesParams,
): Promise<EsimPackage[]> {
  const url = new URL(`${BACKSTAGE_BASE}/packages`);
  // Pull the full catalogue in one shot (currently ~765 rows). Bump again
  // if the team ever exceeds this; worst case is a truncated grid, not a
  // broken page, so the margin is intentionally generous.
  url.searchParams.set('size', '1000');
  url.searchParams.set('page', '1');
  if (params.locationCode) url.searchParams.set('location_code', params.locationCode);
  if (params.type) url.searchParams.set('type', params.type);
  if (params.iccid) url.searchParams.set('iccid', params.iccid);

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Backstage catalogue HTTP ${res.status}`);
  }

  const json = (await res.json()) as BackstagePackagesEnvelope;

  if (json.code !== 0) {
    throw new Error(json.msg || 'Backstage catalogue returned an error');
  }

  const rows = json.data?.packages ?? [];
  return rows.map((r) => mapBackstageRow(r));
}

function mapBackstageRow(r: BackstagePackageRow): EsimPackage {
  const usd = Number(r.price) || 0;

  // `groupPackagesByLocation` downstream uses a "contains comma" heuristic
  // to split the shop into Single-Country vs. Multi-Country/Regional buckets.
  // The backend sends the full coverage in `locations` + an `is_multi_country`
  // flag; we re-hydrate a CSV here when the plan spans multiple countries so
  // that heuristic keeps working. If the backend is still on the old schema
  // (only `location` populated), we fall back to the single ISO.
  const coverage: string[] = Array.isArray(r.locations)
    ? r.locations.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : [];
  const primary = typeof r.location === 'string' && r.location.length > 0 ? r.location : '';
  const all = coverage.length > 0 ? coverage : (primary ? [primary] : []);
  const isMulti = r.is_multi_country === true || all.length > 1;
  const location = isMulti ? all.join(',') : (all[0] ?? '');

  return {
    packageCode: r.package_code,
    name: r.name ?? r.package_code,
    price: Math.round(usd * 10000), // store as micro-cents to match shape
    priceIsRetail: true,
    currencyCode: r.currency ?? 'USD',
    volume: Number(r.volume) || 0,
    unusedValidTime: 0,
    duration: Number(r.duration) || 0,
    durationUnit: (r.duration_unit ?? 'DAY').toUpperCase() === 'MONTH' ? 'MONTH' : 'DAY',
    location,
    description: r.description ?? '',
    activeType: 0,
  };
}

export async function fetchTopUpPackages(iccid: string): Promise<EsimPackage[]> {
  if (USE_BACKSTAGE_CATALOG) {
    return fetchTopUpPackagesFromBackstage(iccid);
  }
  return fetchPackages({ type: 'TOPUP', iccid });
}

/**
 * Backstage top-up catalogue for a specific ICCID. Hits the dedicated
 * `/packages/recharge` endpoint which (a) upserts the supplier's latest
 * recharge options into the team's DB and (b) filters out any plan the
 * team hasn't priced yet. Missing prices → plan hidden; this is intended.
 */
interface BackstageRechargeEnvelope {
  code: number;
  msg: string;
  data?: {
    supplier_type?: string;
    packages?: BackstageRechargeRow[];
  };
}
interface BackstageRechargeRow {
  package_code: string;
  name: string;
  price: number;          // USD float, already retail
  currency?: string;
  volume: number;
  duration: number;
  duration_unit: string;
  location_code?: string | null;
}

async function fetchTopUpPackagesFromBackstage(iccid: string): Promise<EsimPackage[]> {
  const url = new URL(`${BACKSTAGE_BASE}/packages/recharge`);
  url.searchParams.set('iccid', iccid);
  url.searchParams.set('supplier_type', 'esimaccess');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Backstage top-up catalogue HTTP ${res.status}`);

  const json = (await res.json()) as BackstageRechargeEnvelope;
  if (json.code !== 0) throw new Error(json.msg || 'Backstage top-up catalogue error');

  const rows = json.data?.packages ?? [];
  return rows.map((r) => {
    const usd = Number(r.price) || 0;
    return {
      packageCode: r.package_code,
      name: r.name ?? r.package_code,
      price: Math.round(usd * 10000),
      priceIsRetail: true,
      currencyCode: r.currency ?? 'USD',
      volume: Number(r.volume) || 0,
      unusedValidTime: 0,
      duration: Number(r.duration) || 0,
      durationUnit: (r.duration_unit ?? 'DAY').toUpperCase() === 'MONTH' ? 'MONTH' : 'DAY',
      location: r.location_code ?? '',
      description: '',
      activeType: 0,
    } satisfies EsimPackage;
  });
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
    packageCode: esim.packageList?.[0]?.packageCode || '',
    packageName: esim.packageList?.[0]?.packageName || '',
    status: esim.smdpStatus || esim.esimStatus || '',
    smdpStatus: esim.smdpStatus || '',
    expiredTime: esim.expiredTime || '',
    totalVolume: esim.totalVolume || 0,
    usedVolume: 0,
    totalDuration: esim.totalDuration || 0,
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

export const POPULAR_COUNTRY_CODES = ['MX', 'CA', 'JP', 'GB', 'FR', 'IT', 'KR', 'TH', 'DO', 'DE', 'ES', 'CO'];

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

export function formatGB(gb: number): string {
  if (gb >= 1) return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  const mb = Math.round(gb * 1024);
  return `${mb} MB`;
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

/**
 * Resolve the display / charge price for a package in USD.
 *
 * - Backstage-sourced packages (`priceIsRetail === true`) already carry the
 *   team's chosen retail price — return it as-is.
 * - Legacy Red Tea packages carry a wholesale price — apply the 2× markup
 *   via `retailPrice()`.
 *
 * Use this everywhere the UI or a charge amount needs a USD number for a
 * package, instead of calling `retailPrice(pkg.price)` directly.
 */
export function packagePriceUsd(pkg: EsimPackage): number {
  if (pkg.priceIsRetail) return pkg.price / 10000;
  return retailPrice(pkg.price);
}

/**
 * Map Red Tea profile status strings to the unified ActiveSim status.
 * Red Tea returns two status fields:
 *   - smdpStatus: RELEASED | DOWNLOADED | INSTALLED | ENABLED | DISABLED
 *   - esimStatus: NEW | ONBOARD | IN_USE
 * We check esimStatus first (more granular), then fall back to smdpStatus.
 */
export type ActiveSimStatus = 'ACTIVE' | 'EXPIRED' | 'NOT_ACTIVATED' | 'PENDING_ACTIVATION' | 'NEW' | 'ONBOARD' | 'IN_USE';

export function mapRedTeaStatus(statusStr: string): ActiveSimStatus {
  const s = (statusStr || '').toUpperCase().trim();

  if (s === 'IN_USE' || s === 'ENABLED') return 'IN_USE';
  if (s === 'ACTIVE') return 'ACTIVE';
  if (s === 'ONBOARD' || s === 'INSTALLED') return 'ONBOARD';
  if (s === 'NEW' || s === 'RELEASED' || s === 'DOWNLOADED') return 'NEW';
  if (s === 'DISABLED' || s === 'EXPIRED') return 'EXPIRED';

  return 'NEW';
}
