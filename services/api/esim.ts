/**
 * eSIM 服务模块
 * 处理 eSIM 详情查询、用量查询、充值等
 */

import { get, post } from './client';
import type {
  PackageDto,
  PackageListParams,
  PackageLocationsResponse,
  EsimDetailDto,
  EsimUsageDto,
  EsimUsageParams,
  TopupRequest,
  TopupResponse,
  CreatePaymentSessionRequest,
  CreatePaymentSessionResponse,
  RechargeRecordDetailResponse,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────
//
// 所有端点走 App tier（`services/api/client.ts`，基于 `VITE_API_BASE_URL`）。
// 后端已预计算 `supplierRegionCode` / `supplierRegionName`，前端直接使用。
//
// 端点说明：
//   - /app/packages          → 套餐列表（前端传 size=5000 拉全量目录）
//   - /app/packages/hot       → 热门套餐
//   - /app/packages/recharge  → 充值/Top-up 套餐列表
//   - /app/packages/locations → 国家/地区列表
//   - /h5/esim/preview/{iccid}→ eSIM 预览（已弃用，绑定 SIM 改用
//                               activationService.previewByIccid 即 /app/sims/preview）
//
const ENDPOINTS = {
  // 套餐
  PACKAGES: '/app/packages',
  HOT_PACKAGES: '/app/packages/hot',
  RECHARGE_PACKAGES: '/app/packages/recharge',
  PACKAGE_LOCATIONS: '/app/packages/locations',

  // eSIM
  ESIM_BY_ICCID: (iccid: string) => `/app/sims/${iccid}`,
  ESIM_PREVIEW: (iccid: string) => `/h5/esim/preview/${iccid}`,
  ESIM_USAGE: (iccid: string) => `/app/sims/${iccid}/usage`,
  ESIM_ENABLE: (iccid: string) => `/app/esim/${iccid}/enable`,

  // 充值订单
  TOPUP_ORDERS: '/app/recharge',

  // 充值支付
  RECHARGE_PAY: (rechargeId: number) => `/app/recharge/${rechargeId}/pay`,
  RECHARGE_DETAIL: (rechargeId: number) => `/app/recharge/${rechargeId}`,
} as const;

// ─── 套餐服务 ────────────────────────────────────────────────────────────

export const packageService = {
  /**
   * 获取套餐列表
   * @param params 筛选参数
   */
  async getPackages(params?: PackageListParams): Promise<{ packages: PackageDto[] }> {
    // Storefront catalogue — public; omit Bearer so stale tokens never empty the grid.
    return get<{ packages: PackageDto[] }>(ENDPOINTS.PACKAGES, params as Record<string, unknown>, {
      skipAuth: true,
    });
  },

  /**
   * 获取热门套餐
   * @param limit 返回数量
   */
  async getHotPackages(limit?: number): Promise<{ packages: PackageDto[] }> {
    return get<{ packages: PackageDto[] }>(ENDPOINTS.HOT_PACKAGES, { limit }, { skipAuth: true });
  },

  /**
   * Fetch the top-up / recharge catalogue for an existing SIM.
   *
   * Backend accepts `supplier_type`:
   *   - `'esimaccess'` (default) — digital eSIM recharge templates
   *   - `'pccw'` — physical US SIM recharge templates (per-ICCID whitelists)
   * Pass the matching value for physical vs. eSIM, otherwise the backend may
   * return an empty / mismatched list.
   */
  async getRechargePackages(
    iccid: string,
    supplierType?: 'esimaccess' | 'pccw',
  ): Promise<{ packages: PackageDto[] }> {
    const params: Record<string, unknown> = { iccid };
    if (supplierType) params.supplier_type = supplierType;
    return get<{ packages: PackageDto[] }>(ENDPOINTS.RECHARGE_PACKAGES, params, { skipAuth: true });
  },

  /**
   * 获取地区 facets 索引（Shop 首屏唯一一次必调）
   *
   * 返回 `singleCountries` + `multiCountries` 两组筛选项，每项附带
   * `minPrice` / `packageCount` / `countries`（多国）等聚合元数据，
   * 直接驱动 ShopView 渲染——不再需要拉全量 packages 再做客户端分组。
   *
   * 后端字段是 snake_case（`single_countries` / `min_price` / ...），
   * client.ts 在响应入口统一转 camelCase，所以这里类型直接是 camelCase。
   *
   * @see PackageLocationsResponse 字段定义见 types.ts
   */
  async getLocations(): Promise<PackageLocationsResponse> {
    // Public catalogue facets — never send Authorization. A stale app token
    // would trigger 401→refresh churn and strand marketing pages (e.g.
    // /travel-esim) on the 50-country static fallback.
    return get<PackageLocationsResponse>(ENDPOINTS.PACKAGE_LOCATIONS, undefined, {
      skipAuth: true,
    });
  },
};

// ─── eSIM 服务 ────────────────────────────────────────────────────────────

export const esimService = {
  /**
   * Fetch the public SIM preview (used during bind / registration).
   *
   * `supplierType` controls which provider backs the lookup:
   *   - `'esimaccess'` (default) — digital eSIM; used on the eSIM install flow.
   *   - `'pccw'` — US physical SIM. Cards ship preloaded, so the "Bind your SIM"
   *     flow should pass this to load the preloaded plan + balance for top-up.
   *
   * GET /h5/esim/preview/{iccid}?supplier_type={esimaccess|pccw}
   */
  async getPreview(
    iccid: string,
    supplierType?: 'esimaccess' | 'pccw',
  ): Promise<{
    iccid: string;
    status: string;
    package: {
      packageCode: string;
      name: string;
      volume: number;
      duration: number;
      location: string;
    };
    expiredTime: string;
  }> {
    const params = supplierType ? { supplier_type: supplierType } : undefined;
    return get(ENDPOINTS.ESIM_PREVIEW(iccid), params as Record<string, unknown> | undefined);
  },

  /**
   * 获取 eSIM 详情
   * @param iccid eSIM ICCID
   */
  async getDetail(iccid: string): Promise<EsimDetailDto> {
    return get<EsimDetailDto>(ENDPOINTS.ESIM_BY_ICCID(iccid));
  },

  /**
   * 查询 eSIM 用量
   * @param iccid eSIM ICCID
   * @param params 查询参数（是否包含每日用量）
   */
  async getUsage(iccid: string, params?: EsimUsageParams): Promise<EsimUsageDto> {
    return get<EsimUsageDto>(ENDPOINTS.ESIM_USAGE(iccid), params as Record<string, unknown>);
  },

  /**
   * 创建充值订单
   * POST /app/recharge (RechargeController@store)
   * @param data 充值参数（supplierType 必填）
   */
  async topup(data: TopupRequest): Promise<TopupResponse> {
    return post<TopupResponse>(ENDPOINTS.TOPUP_ORDERS, data);
  },

  /**
   * 创建充值支付会话
   * POST /app/recharge/{recharge_id}/pay → PaymentController::createRechargePayment
   * @param rechargeId 充值记录 ID
   * @param data 支付参数（可选，method 默认 stripe）
   */
  async createRechargePayment(rechargeId: number, data?: CreatePaymentSessionRequest): Promise<CreatePaymentSessionResponse> {
    return post<CreatePaymentSessionResponse>(ENDPOINTS.RECHARGE_PAY(rechargeId), data || {});
  },

  /**
   * 查询充值记录详情
   * GET /app/recharge/{recharge_id} → RechargeController@show
   * @param rechargeId 充值记录 ID
   */
  async getRechargeDetail(rechargeId: number): Promise<RechargeRecordDetailResponse> {
    return get<RechargeRecordDetailResponse>(ENDPOINTS.RECHARGE_DETAIL(rechargeId));
  },

  /**
   * 启用 eSIM Profile (LPA enable)
   * 后端调用 CSM SM-DP+ 平台远程启用 profile
   * @param iccid eSIM ICCID
   */
  async enableProfile(iccid: string): Promise<{ status: string; iccid: string }> {
    return post<{ status: string }>(ENDPOINTS.ESIM_ENABLE(iccid), {});
  },

  // ============ 辅助方法 ============

  /**
   * 格式化流量显示
   * @param bytes 字节数
   */
  formatDataVolume(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return gb % 1 === 0 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  },

  /**
   * 计算剩余天数
   * @param expiredTime 过期时间
   */
  calculateDaysRemaining(expiredTime: string): number {
    const now = new Date();
    const expiry = new Date(expiredTime);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  },

  /**
   * 计算用量百分比
   * @param used 已用量
   * @param total 总量
   */
  calculateUsagePercent(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  },
};

export default esimService;