/**
 * Unified Data Service (统一数据服务层)
 *
 * Abstracts the data source so all views import from here instead of
 * directly from esimApi (supplier) or services/api (backend).
 *
 * USE_BACKEND_API is read from .env.local VITE_USE_BACKEND_API.
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

// ─── Supplier API (current) ──────────────────────────────────────────

import {
  fetchPackages as supplierFetchPackages,
  prefetchPackages as supplierPrefetch,
  fetchTopUpPackages as supplierFetchTopUp,
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
  fetchMultiCountryRegionNames,
  type FetchPackagesParams,
  type ContinentTab,
  type ActiveSimStatus,
} from './esimApi';

// ─── Backend API (future) ────────────────────────────────────────────

import { packageService, esimService } from './api';

// =====================================================================
// SWITCH FLAG: reads from .env.local VITE_USE_BACKEND_API
// Defaults to false, set to true when backend has all packages synced
// =====================================================================
export const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

// ─── Data normalization: backend PackageDto → supplier EsimPackage ───

function backendPkgToEsimPackage(dto: PackageDto): EsimPackage {
  // groupPackagesByLocation (esimApi.ts) treats `location` as a CSV and uses
  // a "contains comma" check to flag multi-country / regional plans.
  // The backend emits a single primary ISO in `location` plus the full list
  // in `locations` / `is_multi_country`, so we re-hydrate a CSV here when
  // the plan spans multiple countries — otherwise the client groups every
  // backend-sourced plan as single-country and the "Multi-Country" view is
  // silently empty.
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
    // Backend price is in cents, supplier is micro-cents.
    // Normalize to micro-cents (the format the rest of the app expects).
    price: dto.price * 100,
    currencyCode: dto.currency || 'USD',
    volume: dto.volume,
    duration: dto.duration,
    durationUnit: dto.durationUnit || 'DAY',
    location: csvLocation,
    description: dto.description || dto.name,
    unusedValidTime: dto.duration,
    activeType: 1,
  };
}

// ─── Package listing ─────────────────────────────────────────────────

export async function fetchPackages(params: FetchPackagesParams = {}): Promise<EsimPackage[]> {
  if (!USE_BACKEND_API) {
    return supplierFetchPackages(params);
  }

  try {
    const resp = await packageService.getPackages({
      locationCode: params.locationCode,
      type: params.type,
      iccid: params.iccid,
    });
    return (resp.packages || []).map(backendPkgToEsimPackage);
  } catch {
    // Fallback to supplier if backend fails
    return supplierFetchPackages(params);
  }
}

export function prefetchPackages(): Promise<EsimPackage[]> {
  if (!USE_BACKEND_API) {
    return supplierPrefetch();
  }
  return fetchPackages();
}

/**
 * Fetch the top-up catalogue for a given SIM. Pass `supplierType='pccw'`
 * for physical SIMs (PCCW IoT-M) — those SIMs use a different recharge
 * template pool than our eSIM catalogue and omitting the hint returns
 * an empty list. For eSIMs (Red Tea / EsimAccess) the parameter can be
 * omitted and defaults to `'esimaccess'` backend-side.
 */
export async function fetchTopUpPackages(
  iccid: string,
  supplierType?: 'pccw' | 'esimaccess',
): Promise<EsimPackage[]> {
  if (!USE_BACKEND_API) {
    return supplierFetchTopUp(iccid);
  }

  try {
    const resp = await packageService.getRechargePackages(iccid, supplierType);
    return (resp.packages || []).map(backendPkgToEsimPackage);
  } catch {
    return supplierFetchTopUp(iccid);
  }
}

// ─── Order eSIM ──────────────────────────────────────────────────────

export async function orderEsim(req: EsimOrderRequest): Promise<EsimOrderResult> {
  // Orders always go through supplier for now (backend order flow TBD)
  return supplierOrderEsim(req);
}

// ─── Top Up ──────────────────────────────────────────────────────────

export async function topUp(req: TopUpRequest): Promise<TopUpResult> {
  if (!USE_BACKEND_API) {
    return supplierTopUp(req);
  }

  try {
    const resp = await esimService.topup({
      iccid: req.iccid,
      packageCode: req.packageCode,
      amount: req.amount,
      supplierType: req.supplierType || 'esimaccess',
    });
    return {
      transactionId: resp.orderId,
      iccid: resp.iccid,
      expiredTime: '', // 后端未返回过期时间，充值成功后由后端更新
      totalVolume: 0,  // 后端未返回总量，充值成功后由后端更新
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
  if (!USE_BACKEND_API) {
    return supplierCheckUsage(iccid);
  }

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

/**
 * Look up an ICCID's preloaded plan before the user binds it to their
 * EvairSIM account. Pass `supplierType` to choose the provider:
 *   - `'pccw'`  — physical SIM (PCCW IoT-M). Use this from the "Bind your
 *                 SIM Card" flow — cards arrive preloaded and must be
 *                 verified against PCCW's registry.
 *   - `'esimaccess'` — digital eSIM (EsimAccess / Red Tea). Used from
 *                 the install / post-purchase flow.
 *   - omitted — backend default (esimaccess) for backwards compat.
 *
 * On backend failure we fall back to the legacy direct-supplier call
 * so the dev catalogue / offline simulator keeps working.
 */
export async function queryProfile(
  iccid: string,
  supplierType?: 'pccw' | 'esimaccess',
): Promise<EsimProfileResult> {
  if (!USE_BACKEND_API) {
    return supplierQueryProfile(iccid);
  }

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
  if (!USE_BACKEND_API) {
    return { success: false, status: 'NO_SERVER_API' };
  }

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
    console.log('[unbindSim] Calling API with iccid:', iccid);
    const result = await userService.unbindSim({ iccid });
    console.log('[unbindSim] API result:', result);
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
    console.log('[bindSim] Calling API with iccid:', iccid, 'activationCode:', activationCode);
    const result = await userService.bindSim({ iccid, activationCode });
    console.log('[bindSim] API result:', result);
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
  fetchMultiCountryRegionNames,
};

export type { FetchPackagesParams, ContinentTab, ActiveSimStatus };
