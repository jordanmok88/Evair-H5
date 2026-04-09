/**
 * Data Service (PCCW Backend)
 *
 * 所有数据请求统一走 Laravel 后端 API（PCCW 供应商）。
 */

import type {
  EsimPackage,
  EsimOrderRequest,
  EsimOrderResult,
  EsimProfileResult,
  EnableProfileResult,
  DataUsageResult,
  TopUpRequest,
  TopUpResult,
  EsimCountryGroup,
} from '../types';

import type { PackageDto } from './api/types';
import { packageService, esimService } from './api';

// PCCW 返回的价格单位是美元浮点数（如 9.99），需要乘以 10000 转为 micro-cents
function backendPkgToEsimPackage(dto: PackageDto): EsimPackage {
  return {
    packageCode: dto.packageCode,
    name: dto.name,
    price: Math.round(dto.price * 10000),
    currencyCode: dto.currency || 'USD',
    volume: dto.volume,
    duration: dto.duration,
    durationUnit: dto.durationUnit || 'DAY',
    location: dto.location,
    description: dto.description || dto.name,
    unusedValidTime: dto.duration,
    activeType: 1,
  };
}

// ─── Package listing ─────────────────────────────────────────────────

export interface FetchPackagesParams {
  locationCode?: string;
  type?: 'BASE' | 'TOPUP';
  packageCode?: string;
  iccid?: string;
}

export async function fetchPackages(params: FetchPackagesParams = {}): Promise<EsimPackage[]> {
  const resp = await packageService.getPackages({
    locationCode: params.locationCode,
    type: params.type,
    iccid: params.iccid,
  });
  return (resp.packages || []).map(backendPkgToEsimPackage);
}

export function prefetchPackages(): Promise<EsimPackage[]> {
  return fetchPackages();
}

export async function fetchTopUpPackages(iccid: string): Promise<EsimPackage[]> {
  const resp = await packageService.getRechargePackages({ iccid, supplierType: 'pccw' });
  return (resp.packages || []).map(backendPkgToEsimPackage);
}

/** Fetch PCCW recharge packages for homepage display (no iccid required) */
export async function fetchRechargePackages(): Promise<EsimPackage[]> {
  const resp = await packageService.getRechargePackages({ supplierType: 'pccw' });
  return (resp.packages || []).map(backendPkgToEsimPackage);
}

// ─── Order eSIM ──────────────────────────────────────────────────────

export async function orderEsim(_req: EsimOrderRequest): Promise<EsimOrderResult> {
  // PCCW 实体卡项目不支持 eSIM 订购
  throw new Error('eSIM ordering is not supported for PCCW');
}

// ─── Top Up ──────────────────────────────────────────────────────────

export async function topUp(req: TopUpRequest): Promise<TopUpResult> {
  const resp = await esimService.topup({
    iccid: req.iccid,
    packageCode: req.packageCode,
    supplierType: req.supplierType || 'pccw',
    ...(req.amount != null ? { amount: req.amount } : {}),
  });
  return {
    transactionId: resp.orderId,
    iccid: resp.iccid,
    expiredTime: '',
    totalVolume: 0,
    totalDuration: 30,
    orderUsage: 0,
  };
}

// ─── Data Usage ──────────────────────────────────────────────────────

export async function checkDataUsage(iccid: string): Promise<DataUsageResult> {
  const usage = await esimService.getUsage(iccid);
  return {
    iccid: usage.iccid,
    totalVolume: usage.totalVolume,
    usedVolume: usage.usedVolume,
    expiredTime: usage.expiredTime,
  };
}

// ─── Query Profile ───────────────────────────────────────────────────

export async function queryProfile(iccid: string): Promise<EsimProfileResult> {
  const preview = await esimService.getPreview(iccid);
  return {
    iccid: preview.iccid,
    packageCode: preview.package?.packageCode || '',
    packageName: preview.package?.name || '',
    status: preview.status,
    smdpStatus: preview.status,
    expiredTime: preview.expiredTime || '',
    totalVolume: preview.package?.volume || 0,
    usedVolume: 0,
    totalDuration: preview.package?.duration || 0,
  };
}

// ─── Enable Profile (LPA) ────────────────────────────────────────────

export async function enableProfile(iccid: string): Promise<EnableProfileResult> {
  try {
    const result = await esimService.enableProfile(iccid);
    return { success: true, status: result.status };
  } catch {
    return { success: false, status: 'API_ERROR' };
  }
}

// ─── Unbind SIM ──────────────────────────────────────────────────────

export async function unbindSim(iccid: string): Promise<{ success: boolean }> {
  const { userService } = await import('./api');
  try {
    const result = await userService.unbindSim({ iccid });
    return result;
  } catch (err: any) {
    console.error('[unbindSim] API error:', err?.message, 'code:', err?.code);
    throw err;
  }
}

// ─── Bind SIM ────────────────────────────────────────────────────────

export async function bindSim(iccid: string, activationCode?: string): Promise<{ success: boolean; sim?: any }> {
  const { userService } = await import('./api');
  try {
    const result = await userService.bindSim({ iccid, activationCode });
    return result;
  } catch (err: any) {
    console.error('[bindSim] API error:', err?.message, 'code:', err?.code);
    throw err;
  }
}

// ─── Constants & Utilities ───────────────────────────────────────────

export const DEMO_MODE = false;
export const USE_BACKEND_API = true;

export const POPULAR_COUNTRY_CODES = ['MX', 'CA', 'JP', 'GB', 'FR', 'IT', 'KR', 'TH', 'DO', 'DE', 'ES', 'CO'];

export const CONTINENT_TABS = ['All', 'Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Multi-Region'] as const;
export type ContinentTab = (typeof CONTINENT_TABS)[number];

export type ActiveSimStatus = 'ACTIVE' | 'EXPIRED' | 'NOT_ACTIVATED' | 'PENDING_ACTIVATION' | 'NEW' | 'ONBOARD' | 'IN_USE';

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

export function retailPrice(microCents: number): number {
  const cost = microCents / 10000;
  const marked = cost * 2;
  return Math.ceil(marked) - 0.01;
}

export function mapRedTeaStatus(statusStr: string): ActiveSimStatus {
  const s = (statusStr || '').toUpperCase().trim();
  if (s === 'IN_USE' || s === 'ENABLED') return 'IN_USE';
  if (s === 'ACTIVE') return 'ACTIVE';
  if (s === 'ONBOARD' || s === 'INSTALLED') return 'ONBOARD';
  if (s === 'NEW' || s === 'RELEASED' || s === 'DOWNLOADED') return 'NEW';
  if (s === 'DISABLED' || s === 'EXPIRED') return 'EXPIRED';
  return 'NEW';
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

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try { return displayNames.of(code.toUpperCase()) ?? code; } catch { return code; }
}

function resolveLocationName(location: string): string {
  const codes = location.split(',').map(c => c.trim());
  if (codes.length === 1) return countryName(codes[0]);
  if (codes.length <= 3) return codes.map(c => countryName(c)).join(', ');
  return `${countryName(codes[0])} +${codes.length - 1} countries`;
}

function getContinent(code: string): string {
  return CONTINENT_MAP[code.toUpperCase()] ?? 'Other';
}

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
