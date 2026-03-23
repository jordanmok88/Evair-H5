/**
 * Unified Data Service (统一数据服务层)
 *
 * Abstracts the data source so all views import from here instead of
 * directly from esimApi (supplier) or services/api (backend).
 *
 * When the backend finishes syncing all 2,489 packages, flip
 * USE_BACKEND_API to true -- no other files need to change.
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
  formatGB,
  mapRedTeaStatus,
  DEMO_MODE,
  type FetchPackagesParams,
  type ContinentTab,
  type ActiveSimStatus,
} from './esimApi';

// ─── Backend API (future) ────────────────────────────────────────────

import { packageService, esimService } from './api';

// =====================================================================
// SWITCH FLAG: flip to true when backend has all packages synced
// =====================================================================
export const USE_BACKEND_API = false;

// ─── Data normalization: backend PackageDto → supplier EsimPackage ───

function backendPkgToEsimPackage(dto: PackageDto): EsimPackage {
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
    location: dto.location,
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

export async function fetchTopUpPackages(iccid: string): Promise<EsimPackage[]> {
  if (!USE_BACKEND_API) {
    return supplierFetchTopUp(iccid);
  }

  try {
    const resp = await packageService.getRechargePackages(iccid);
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
  // Top-up goes through supplier (backend top-up flow TBD)
  return supplierTopUp(req);
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

export async function queryProfile(iccid: string): Promise<EsimProfileResult> {
  if (!USE_BACKEND_API) {
    return supplierQueryProfile(iccid);
  }

  try {
    const detail = await esimService.getDetail(iccid);
    return {
      iccid: detail.iccid,
      packageCode: detail.package?.packageCode || '',
      packageName: detail.package?.name || '',
      status: detail.status,
      smdpStatus: detail.status,
      expiredTime: detail.validity?.expiredTime || '',
      totalVolume: detail.usage?.totalVolume || 0,
      usedVolume: detail.usage?.usedVolume || 0,
      totalDuration: detail.package?.duration || 0,
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

// ─── Re-export utilities (no data source dependency) ─────────────────

export {
  groupPackagesByLocation,
  getPopularGroups,
  CONTINENT_TABS,
  POPULAR_COUNTRY_CODES,
  formatVolume,
  formatPrice,
  retailPrice,
  formatGB,
  mapRedTeaStatus,
  DEMO_MODE,
};

export type { FetchPackagesParams, ContinentTab, ActiveSimStatus };
