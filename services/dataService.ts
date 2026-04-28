/**
 * Unified Data Service (统一数据服务层)
 *
 * 所有数据请求统一通过 Backend API client (`services/api/`) 走 App tier 端点。
 * 不再有 supplier 直连路径和 `USE_BACKEND_API` 双路径切换。
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

// ─── Supplier API (order + topup via Netlify proxy) ─────────────────

import {
  orderEsim as supplierOrderEsim,
  topUp as supplierTopUp,
  checkDataUsage as supplierCheckUsage,
  queryProfile as supplierQueryProfile,
  groupPackagesByLocation,
  getPopularGroups,
  CONTINENT_TABS,
  POPULAR_COUNTRY_CODES,
  formatVolume,
  formatPrice,
  retailPrice,
  packagePriceUsd,
  formatGB,
  mapRedTeaStatus,
  DEMO_MODE,
  type FetchPackagesParams,
  type ContinentTab,
  type ActiveSimStatus,
} from './esimApi';

// ─── Backend API ────────────────────────────────────────────────────

import { packageService, esimService } from './api';

// ─── Data normalization: backend PackageDto → supplier EsimPackage ───
//
// `dto.price` is a USD float from the backend (already retail).
// The rest of the app speaks "micro-cents" (10000 = $1.00), so we multiply
// by 10000 and stamp `priceIsRetail: true` so `packagePriceUsd()` skips the
// legacy 2× wholesale-→-retail markup.
//
// `dto.locations` is a pure ISO-2 list (backend filters out region codes
// like "NA-3" in PackageResource). `dto.supplierRegionCode` /
// `dto.supplierRegionName` carry the multi-country grouping info.

function backendPkgToEsimPackage(dto: PackageDto): EsimPackage {
  const coverage = Array.isArray(dto.locations) && dto.locations.length > 0
    ? dto.locations
    : dto.location
    ? [dto.location]
    : [];
  const isMulti = dto.is_multi_country === true || coverage.length > 1;
  const csvLocation = isMulti ? coverage.join(',') : (coverage[0] ?? dto.location ?? '');

  return {
    packageCode: dto.packageCode,
    name: dto.name,
    price: dto.price * 10000,
    priceIsRetail: true,
    currencyCode: dto.currency || 'USD',
    volume: dto.volume,
    duration: dto.duration,
    durationUnit: dto.durationUnit || 'DAY',
    location: csvLocation,
    description: dto.description || dto.name,
    unusedValidTime: dto.duration,
    activeType: 1,
    coverageCodes: coverage,
    supplierRegionCode: dto.supplierRegionCode,
    supplierRegionName: dto.supplierRegionName,
  };
}

// ─── Package listing ─────────────────────────────────────────────────
//
// All package queries go through the App tier API client.
// size=5000 pulls the full catalogue in one shot, matching Flutter APP's
// `shop_providers.dart` (`perPage: 5000`). The backend now pre-computes
// `supplierRegionCode` and `supplierRegionName` so the frontend no longer
// needs a separate /packages/locations request or regex extraction.

const CACHE_KEY = 'evair_esim_packages_v6';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

let _prefetchPromise: Promise<EsimPackage[]> | null = null;
let _prefetchTimestamp = 0;

export async function fetchPackages(params: FetchPackagesParams = {}): Promise<EsimPackage[]> {
  const isFullList = !params.locationCode && !params.type && !params.packageCode && !params.iccid;

  if (isFullList) {
    const cached = getCachedPackages();
    if (cached) return cached;
  }

  const resp = await packageService.getPackages({
    locationCode: params.locationCode,
    type: params.type,
    size: 5000,
    page: 1,
  });

  const dtos = resp.packages || [];
  const filtered = params.type
    ? dtos
    : dtos.filter(d => (d.type ?? 'BASE') !== 'TOPUP');
  const packages = filtered.map(backendPkgToEsimPackage);

  if (isFullList) {
    setCachedPackages(packages);
  }

  return packages;
}

export function prefetchPackages(): Promise<EsimPackage[]> {
  const now = Date.now();
  if (!_prefetchPromise || (now - _prefetchTimestamp > CACHE_TTL_MS)) {
    _prefetchTimestamp = now;
    _prefetchPromise = fetchPackages();
  }
  return _prefetchPromise;
}

/**
 * Fetch the top-up catalogue for a given SIM. Pass `supplierType='pccw'`
 * for US physical SIMs — a different recharge template pool than eSIM; omitting
 * the hint returns an empty list. For eSIMs the parameter can be omitted
 * and defaults to `'esimaccess'` backend-side.
 */
export async function fetchTopUpPackages(
  iccid: string,
  supplierType?: 'pccw' | 'esimaccess',
): Promise<EsimPackage[]> {
  const resp = await packageService.getRechargePackages(iccid, supplierType);
  return (resp.packages || []).map(backendPkgToEsimPackage);
}

// ─── Order eSIM ──────────────────────────────────────────────────────

export async function orderEsim(req: EsimOrderRequest): Promise<EsimOrderResult> {
  return supplierOrderEsim(req);
}

// ─── Top Up ──────────────────────────────────────────────────────────

export async function topUp(req: TopUpRequest): Promise<TopUpResult> {
  try {
    const resp = await esimService.topup({
      iccid: req.iccid,
      packageCode: req.packageCode,
      supplierType: req.supplierType || 'esimaccess',
    });
    return {
      transactionId: String(resp.id),
      iccid: resp.iccid,
      expiredTime: '',
      totalVolume: 0,
      totalDuration: 30,
      orderUsage: 0,
    };
  } catch (err) {
    console.error('Backend topup failed, falling back to supplier:', err);
    return supplierTopUp(req);
  }
}

// ─── Data Usage ──────────────────────────────────────────────────────

export async function checkDataUsage(iccid: string): Promise<DataUsageResult> {
  try {
    const usage = await esimService.getUsage(iccid);
    return {
      iccid: usage.iccid,
      totalVolume: usage.totalVolume,
      usedVolume: usage.usedVolume,
      expiredTime: usage.expiredTime,
    };
  } catch {
    return supplierCheckUsage(iccid);
  }
}

// ─── Query Profile ───────────────────────────────────────────────────

export async function queryProfile(
  iccid: string,
  supplierType?: 'pccw' | 'esimaccess',
): Promise<EsimProfileResult> {
  try {
    const preview = await esimService.getPreview(iccid, supplierType);
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
  } catch {
    return supplierQueryProfile(iccid);
  }
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

// ─── Re-export utilities (no data source dependency) ─────────────────

export {
  groupPackagesByLocation,
  getPopularGroups,
  CONTINENT_TABS,
  POPULAR_COUNTRY_CODES,
  formatVolume,
  formatPrice,
  retailPrice,
  packagePriceUsd,
  formatGB,
  mapRedTeaStatus,
  DEMO_MODE,
};

export type { FetchPackagesParams, ContinentTab, ActiveSimStatus };
