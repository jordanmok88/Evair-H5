import type {
  EsimApiResponse,
  EsimPackage,
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

// ─── Package types (shared with dataService) ─────────────────────────

export interface FetchPackagesParams {
  locationCode?: string;
  type?: 'BASE' | 'TOPUP';
  packageCode?: string;
  iccid?: string;
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
    } as unknown as TopUpResult;
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

/**
 * Group packages by location (country code or supplier region code).
 *
 * Multi-country plans use `supplierRegionCode` (e.g. "NA-3") as the
 * grouping key and `supplierRegionName` (e.g. "Europe (30+ countries)")
 * for the display name — both pre-computed by the backend.
 */
export function groupPackagesByLocation(packages: EsimPackage[]): EsimCountryGroup[] {
  const map = new Map<string, EsimPackage[]>();

  for (const pkg of packages) {
    const codes = pkg.coverageCodes ?? (pkg.location ? pkg.location.split(',').map((c) => c.trim()).filter(Boolean) : []);
    const isMulti = (pkg.supplierRegionCode !== undefined) || codes.length > 1;
    if (isMulti) {
      if (!pkg.supplierRegionCode) continue;
      const key = pkg.supplierRegionCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pkg);
    } else {
      const key = codes[0] ?? pkg.location;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pkg);
    }
  }

  const groups: EsimCountryGroup[] = [];
  for (const [key, pkgs] of map.entries()) {
    const allCodes = new Set<string>();
    for (const p of pkgs) {
      for (const c of p.coverageCodes ?? []) allCodes.add(c);
    }
    const countries = Array.from(allCodes);
    const regionCode = pkgs.find((p) => p.supplierRegionCode)?.supplierRegionCode;
    const regionName = pkgs.find((p) => p.supplierRegionCode === regionCode)?.supplierRegionName;
    const isMultiRegion = regionCode !== undefined || countries.length > 1;
    const primaryCode = countries[0] ?? key;
    const locationName = isMultiRegion
      ? (regionName ?? `${regionCode} (${countries.length} countries)`)
      : countryName(primaryCode);
    groups.push({
      locationCode: key,
      locationName,
      flag: primaryCode,
      packages: pkgs.sort((a, b) => a.volume - b.volume),
      continent: isMultiRegion ? 'Multi-Region' : getContinent(primaryCode),
      isMultiRegion,
      countries,
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
 * 获取套餐的最终展示 / 支付价格（USD）。
 *
 * 【后端价格链路】
 *   supplier_packages.final_price（Admin 手动设，最高优先）
 *     → supplier_packages.retail_price（Admin 设，当前绝大多数走这个）
 *       → supplier_packages.price × 1.5（兜底，实际未用到）
 *         ↓ esimaccess:sync-products 预计算
 *   products.price → App tier API 的 `price` 字段 → 此处取出
 *
 * 【前端两条路径】
 *   - Backend 路径（当前生效）：`priceIsRetail === true`，直接返回
 *     `pkg.price / 10000`（即后端 products.price 的原值），不做加价。
 *   - Legacy Red Tea 直连路径：`priceIsRetail` 未设置，走 `retailPrice()`
 *     做 2× 加价。此路径已不使用（仅 DEMO_MODE supplier 直连）。
 *
 * ⚠️ 不要直接调用 `retailPrice(pkg.price)` — 对 Backend 套餐会重复加价。
 */
export function packagePriceUsd(pkg: EsimPackage): number {
  if (pkg.priceIsRetail) return pkg.price / 10000;
  return retailPrice(pkg.price);
}

/**
 * Map Red Tea profile status strings to the unified ActiveSim status.
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
