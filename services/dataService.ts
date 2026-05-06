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
  getContinent,
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
import { finalizeShopCatalogPackages } from './catalogPresentation';
import { topUpKeepsStrictlyGreaterThanOneGib } from '../utils/topupCatalogFilters';

// ─── Backend API ────────────────────────────────────────────────────

import { packageService, esimService } from './api';
import type { PackageLocationsResponse } from './api/types';
import {
  EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT,
  EMBEDDED_MIN_SINGLE_COUNTRY_FACETS,
} from '../data/catalogLocationFacetsEmbed';

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
  // 历史坑：之前这里读的是 `dto.is_multi_country`（snake），HTTP 层
  // 已经把它转成 camel `isMultiCountry`，所以原判断恒为 false。
  // 既然 coverage.length 已能覆盖大多数场景，这里依然用兜底语义，
  // 但显式读 camel 字段便于以后扩展。
  const isMulti = dto.isMultiCountry === true || coverage.length > 1;
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
    // 后端为单国包返回 null（不是省略），下游 `groupPackagesByLocation`
    // 用 `!== undefined` 判定是否多国，所以这里必须把 null 归一为 undefined，
    // 否则单国套餐会被错判成多国并被跳过（root cause of "Single Country empty"）。
    supplierRegionCode: dto.supplierRegionCode ?? undefined,
    supplierRegionName: dto.supplierRegionName ?? undefined,
    networkPartnerSummary: dto.networkPartnerSummary?.trim() || undefined,
    supplierType: dto.supplierType ?? undefined,
  };
}

// ─── Package listing ─────────────────────────────────────────────────
//
// All package queries go through the App tier API client.
// size=5000 pulls the full catalogue in one shot, matching Flutter APP's
// `shop_providers.dart` (`perPage: 5000`). The backend now pre-computes
// `supplierRegionCode` and `supplierRegionName` so the frontend no longer
// needs a separate /packages/locations request or regex extraction.

const CACHE_KEY = 'evair_esim_packages_v8';
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
  const { omitShopPresentation, ...fetchParams } = params;
  const isFullList =
    !fetchParams.locationCode &&
    !fetchParams.type &&
    !fetchParams.packageCode &&
    !fetchParams.iccid;

  if (isFullList) {
    const cached = getCachedPackages();
    if (cached) return cached;
  }

  const resp = await packageService.getPackages({
    locationCode: fetchParams.locationCode,
    type: fetchParams.type,
    scope: fetchParams.scope,
    size: 5000,
    page: 1,
  });

  const dtos = resp.packages || [];
  const filtered = fetchParams.type
    ? dtos
    : dtos.filter(d => (d.type ?? 'BASE') !== 'TOPUP');
  let packages = filtered.map(backendPkgToEsimPackage);

  if (!omitShopPresentation) {
    packages = finalizeShopCatalogPackages(packages);
  }

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

// ─── Shop facets：首屏用的轻量索引 ───────────────────────────────────────
//
// 商店首屏不再拉全量 5000 条 packages 再做客户端分组；改为：
//   1. 一次请求 /app/packages/locations 拿到 single + multi 两组筛选项
//      （每条只有 code/name/minPrice/packageCount/countries 等元数据）
//   2. 用户点开某个国家/区域时，再用 fetchPackagesForGroup() 单独拉
//      该 location 的具体 packages
//
// 收益：首屏 payload 从 ~2.5MB 降到 ~5KB；价格/库存实时；前端分组逻辑
// （含 null vs undefined 边界 case）整体被绕开。
//
// 详细设计见根目录 README / 与本项目 ShopView 的整合点。

const FACETS_CACHE_KEY = 'evair_esim_facets_v1';
const FACETS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟（比 packages 缓存短，价格更敏感）

interface FacetsCache {
  ts: number;
  data: EsimCountryGroup[];
}

/** Ignore tiny/partial caches (never expose the abandoned ~50-country marketing subset). */
const MIN_TRUSTED_SINGLE_FACET_GROUPS = Math.min(100, EMBEDDED_MIN_SINGLE_COUNTRY_FACETS - 10);

function countSingleFacetRows(groups: EsimCountryGroup[]): number {
  return groups.filter(g => !g.isMultiRegion).length;
}

function getCachedFacets(): EsimCountryGroup[] | null {
  try {
    const raw = localStorage.getItem(FACETS_CACHE_KEY);
    if (!raw) return null;
    const cache: FacetsCache = JSON.parse(raw);
    if (Date.now() - cache.ts > FACETS_CACHE_TTL_MS) {
      localStorage.removeItem(FACETS_CACHE_KEY);
      return null;
    }
    const data = cache.data;
    if (!Array.isArray(data) || countSingleFacetRows(data) < MIN_TRUSTED_SINGLE_FACET_GROUPS) {
      localStorage.removeItem(FACETS_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedFacets(data: EsimCountryGroup[]): void {
  try {
    const cache: FacetsCache = { ts: Date.now(), data };
    localStorage.setItem(FACETS_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage 满了忽略 */ }
}

function facetSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryFetchLocationsFromApi(): Promise<PackageLocationsResponse | null> {
  const attempts = 3;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await packageService.getLocations();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await facetSleep(320 * (i + 1));
    }
  }
  console.warn('[dataService] /app/packages/locations failed after retries:', lastErr);
  return null;
}

function locationsResponseToGroups(resp: PackageLocationsResponse): EsimCountryGroup[] {
  const singles = resp.singleCountries || [];
  const multis = resp.multiCountries || [];
  const groups: EsimCountryGroup[] = [];

  for (const s of singles) {
    const code = s.code.toUpperCase();
    const minPrice = typeof s.minPrice === 'number' && Number.isFinite(s.minPrice) ? s.minPrice : 0;
    const packageCount =
      typeof s.packageCount === 'number' && Number.isFinite(s.packageCount) && s.packageCount >= 0
        ? s.packageCount
        : 0;
    groups.push({
      locationCode: code,
      locationName: s.name,
      flag: code,
      packages: [],
      continent: getContinent(code),
      isMultiRegion: false,
      countries: [code],
      minPrice,
      packageCount,
    });
  }

  for (const m of multis) {
    const countries = (m.countries || []).map((c) => c.toUpperCase());
    const minPrice = typeof m.minPrice === 'number' && Number.isFinite(m.minPrice) ? m.minPrice : 0;
    const packageCount =
      typeof m.packageCount === 'number' && Number.isFinite(m.packageCount) && m.packageCount >= 0
        ? m.packageCount
        : 0;
    groups.push({
      locationCode: m.code,
      locationName: m.name,
      flag: countries[0] ?? m.code,
      packages: [],
      continent: 'Multi-Region',
      isMultiRegion: true,
      countries,
      minPrice,
      packageCount,
    });
  }

  groups.sort((a, b) => a.locationName.localeCompare(b.locationName));
  return groups;
}

export type FetchLocationFacetsResult = {
  groups: EsimCountryGroup[];
  /**
   * True when live API failed or returned too few countries — built-in snapshot is used so the
   * shop/travel catalogue still lists the full stocked universe (pricing may lag the server).
   */
  usedEmbeddedFallback: boolean;
};

/**
 * Same as {@link fetchLocationFacets}, plus whether the bundled snapshot substituted for API data.
 */
export async function fetchLocationFacetsDetailed(
  force = false,
): Promise<FetchLocationFacetsResult> {
  try {
    if (!force) {
      const cached = getCachedFacets();
      if (cached) return { groups: cached, usedEmbeddedFallback: false };
    }

    const live = await tryFetchLocationsFromApi();
    const liveSingles = live?.singleCountries?.length ?? 0;
    const liveOk =
      live !== null && liveSingles >= MIN_TRUSTED_SINGLE_FACET_GROUPS;

    const usedEmbed = !liveOk;
    const resp = liveOk ? live! : EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT;

    if (usedEmbed && live !== null) {
      console.warn(
        '[dataService] Facets payload too thin from API;',
        liveSingles,
        'countries — using embedded snapshot',
      );
    }

    const groups = locationsResponseToGroups(resp);
    setCachedFacets(groups);

    return { groups, usedEmbeddedFallback: usedEmbed };
  } catch (e) {
    console.error('[dataService] fetchLocationFacetsDetailed failed — embedding snapshot:', e);
    const groups = locationsResponseToGroups(EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT);
    try {
      setCachedFacets(groups);
    } catch {
      /* ignore */
    }
    return { groups, usedEmbeddedFallback: true };
  }
}

/**
 * 拉取 Shop 首屏 facets 索引并转换为 EsimCountryGroup[] 形态。
 *
 * `force=true` 会绕过本地缓存（用于 Shop 页面的下拉刷新）。
 *
 * NEVER returns only the tiny static SEO `/travel-esim` subset: retries + bundled snapshot fallback
 * keep parity with Laravel's stocked catalogue (~179+ singles as of last embed regenerate).
 */
export async function fetchLocationFacets(force = false): Promise<EsimCountryGroup[]> {
  const { groups } = await fetchLocationFacetsDetailed(force);
  return groups;
}

/**
 * 按需拉取一个 EsimCountryGroup 的具体 packages。
 *
 * 调用时机：用户点开 Shop 网格里的某张国家/区域卡 → 进入详情前。
 *
 * 返回的是一份**新**的 group 对象（packages 已填充），调用方应该用
 * 它替换原 group 而不是直接 mutate（保持 React 状态可识别变更）。
 */
export async function fetchPackagesForGroup(
  group: EsimCountryGroup,
): Promise<EsimCountryGroup> {
  const packages = await fetchPackages({
    locationCode: group.locationCode,
    // 显式告诉后端单国还是多国，避免猜测语义（见 PackageController::applyLocationFilter）
    scope: group.isMultiRegion ? 'multi' : 'single',
  });
  // 起价以"已加载的最低 price"覆盖 facets 缓存里的 minPrice，
  // 价格更精确（facets 是聚合快照，可能因缓存稍滞后）
  const liveMin = packages.reduce(
    (acc, p) => (acc === null || packagePriceUsd(p) < acc ? packagePriceUsd(p) : acc),
    null as number | null,
  );
  return {
    ...group,
    packages,
    packageCount: packages.length,
    minPrice: liveMin ?? group.minPrice,
  };
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
  let list = (resp.packages || []).map(backendPkgToEsimPackage);
  if (supplierType !== 'pccw') {
    list = list.filter(p => topUpKeepsStrictlyGreaterThanOneGib(p.volume));
  }
  return list;
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

function normalizeDataUsageDto(
  iccid: string,
  u: { iccid?: string; totalVolume?: number; usedVolume?: number; expiredTime?: string | null },
): DataUsageResult {
  return {
    iccid: (typeof u.iccid === 'string' && u.iccid.trim()) || iccid,
    totalVolume: Math.max(0, Number(u.totalVolume) || 0),
    usedVolume: Math.max(0, Number(u.usedVolume) || 0),
    expiredTime: typeof u.expiredTime === 'string' ? u.expiredTime.trim() : '',
  };
}

function usageSnapshotHasSignal(u: DataUsageResult): boolean {
  const exp = u.expiredTime?.trim() ?? '';
  const expOk = Boolean(exp && !Number.isNaN(Date.parse(exp)));
  return u.totalVolume > 0 || u.usedVolume > 0 || expOk;
}

/** After bind, Laravel `sim_assets` often keeps used_bytes at 0 while Red Tea advances CDR via `remain`. */
const TEN_MB_BYTES = 10 * 1024 * 1024;
/** Used bytes below this are reconciled vs supplier — catches `sim_assets` stuck at zero while Red Tea has real CDR. */
const LOW_USED_BYTES_CEILING = 1024 * 1024;

/**
 * Laravel `GET /app/sims/{iccid}/usage` reads `sim_assets`, which may lag supplier CDR (`orderUsage` vs `remain`).
 * We still prefer Laravel when it's already materially non-zero — avoids doubling traffic for healthy rows.
 *
 * Netlify `/esim/usage` fallback (`supplierCheckUsage`) matches the supplier console when Laravel is stale /
 * pegged at zero used with a plausible total + expiry (`usageSnapshotHasSignal` alone is NOT enough — that
 * shortcut previously hid GB-scale drift forever).
 */
export async function checkDataUsage(iccid: string): Promise<DataUsageResult> {
  let primary: DataUsageResult;
  try {
    primary = normalizeDataUsageDto(iccid, await esimService.getUsage(iccid));
  } catch {
    return normalizeDataUsageDto(iccid, await supplierCheckUsage(iccid));
  }

  let sup: DataUsageResult | undefined;
  try {
    const shouldReconcile =
      !usageSnapshotHasSignal(primary) || primary.usedVolume < LOW_USED_BYTES_CEILING;
    if (shouldReconcile) {
      sup = normalizeDataUsageDto(iccid, await supplierCheckUsage(iccid));
    }
  } catch {
    /* keep primary — supplier unreachable or DEMO */
  }

  if (!sup) {
    return primary;
  }

  const totalsRoughlyAligned =
    primary.totalVolume > 0 &&
    sup.totalVolume > 0 &&
    Math.abs(sup.totalVolume - primary.totalVolume) / primary.totalVolume < 0.25;

  const coherentCap = Math.max(primary.totalVolume, sup.totalVolume);
  const supplierAhead =
    totalsRoughlyAligned &&
    sup.usedVolume > primary.usedVolume + TEN_MB_BYTES &&
    sup.usedVolume <= coherentCap * 1.06;

  if (supplierAhead) {
    const mergedExpiry = ((): string => {
      const p = primary.expiredTime?.trim() ?? '';
      const s = sup.expiredTime?.trim() ?? '';
      if (p && !Number.isNaN(Date.parse(p))) return primary.expiredTime;
      if (s && !Number.isNaN(Date.parse(s))) return sup.expiredTime;
      return primary.expiredTime || sup.expiredTime || '';
    })();

    return {
      iccid: primary.iccid,
      totalVolume: Math.max(primary.totalVolume, sup.totalVolume),
      usedVolume: sup.usedVolume,
      expiredTime: mergedExpiry,
    };
  }

  if (!usageSnapshotHasSignal(primary) && usageSnapshotHasSignal(sup)) {
    return sup;
  }

  return primary;
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

export async function unbindSim(simId: number): Promise<void> {
  const { userService } = await import('./api');

  try {
    await userService.unbindSim({ simId });
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
  getContinent,
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
