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
  };
}

// ─── Package listing ─────────────────────────────────────────────────
//
// All package queries go through the App tier API client.
// size=5000 pulls the full catalogue in one shot, matching Flutter APP's
// `shop_providers.dart` (`perPage: 5000`). The backend now pre-computes
// `supplierRegionCode` and `supplierRegionName` so the frontend no longer
// needs a separate /packages/locations request or regex extraction.

const CACHE_KEY = 'evair_esim_packages_v7';
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

function getCachedFacets(): EsimCountryGroup[] | null {
  try {
    const raw = localStorage.getItem(FACETS_CACHE_KEY);
    if (!raw) return null;
    const cache: FacetsCache = JSON.parse(raw);
    if (Date.now() - cache.ts > FACETS_CACHE_TTL_MS) {
      localStorage.removeItem(FACETS_CACHE_KEY);
      return null;
    }
    return cache.data;
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

/**
 * 拉取 Shop 首屏 facets 索引并转换为 EsimCountryGroup[] 形态。
 *
 * 返回的每个 group 满足：
 *   - 单国：locationCode = ISO 码，flag = ISO 码，continent 由 getContinent 算
 *   - 多国：locationCode = supplier region code（如 "NA-3"），flag = countries[0]，
 *           continent = "Multi-Region"
 *   - packages 暂为空数组；进入详情时由 fetchPackagesForGroup() 填充
 *   - minPrice / packageCount 直接来自后端聚合，卡片渲染立即可用
 *
 * `force=true` 会绕过本地缓存（用于 Shop 页面的下拉刷新）。
 */
export async function fetchLocationFacets(force = false): Promise<EsimCountryGroup[]> {
  if (!force) {
    const cached = getCachedFacets();
    if (cached) return cached;
  }

  const resp = await packageService.getLocations();
  const singles = resp.singleCountries || [];
  const multis = resp.multiCountries || [];

  const groups: EsimCountryGroup[] = [];

  for (const s of singles) {
    const code = s.code.toUpperCase();
    groups.push({
      locationCode: code,
      locationName: s.name,
      flag: code,
      packages: [],
      continent: getContinent(code),
      isMultiRegion: false,
      countries: [code],
      minPrice: s.minPrice,
      packageCount: s.packageCount,
    });
  }

  for (const m of multis) {
    const countries = (m.countries || []).map((c) => c.toUpperCase());
    groups.push({
      locationCode: m.code,
      locationName: m.name,
      flag: countries[0] ?? m.code,
      packages: [],
      continent: 'Multi-Region',
      isMultiRegion: true,
      countries,
      minPrice: m.minPrice,
      packageCount: m.packageCount,
    });
  }

  // 与旧 groupPackagesByLocation 保持一致的字典序排序，便于网格定位国家
  groups.sort((a, b) => a.locationName.localeCompare(b.locationName));

  setCachedFacets(groups);
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
