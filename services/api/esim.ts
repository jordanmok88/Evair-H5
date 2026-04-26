/**
 * eSIM 服务模块
 * 处理 eSIM 详情查询、用量查询、充值等
 */

import { get, post } from './client';
import type {
  PackageDto,
  PackageListParams,
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
// 【重要】这些端点走的是 H5 旧接口路径（`services/api/client.ts`，基于 `VITE_API_BASE_URL`），
// 仅在 `VITE_USE_BACKEND_API=true` 时由 `dataService.ts` 调用。
// 商店列表（eSIM 套餐浏览）不走这里，而是走 `esimApi.ts` 的 `fetchPackagesFromBackstage`。
//
// 端点说明：
//   - /h5/packages          → 套餐列表（有 size=20 默认限制，不适合全量商店列表）
//   - /h5/packages/hot       → 热门套餐（Admin 后台排序，少量精选）
//   - /h5/packages/recharge  → 充值/Top-up 套餐列表（按 ICCID 或 supplier_type 筛选）
//   - /h5/packages/locations → 国家/地区列表（multi_countries 用于多国分组名称）
//   - /h5/esim/preview/{iccid}→ eSIM 预览（旧的 H5 端接口，绑定 SIM 卡已改用
//                               activationService.previewByIccid 即 /app/sims/preview）
//
const ENDPOINTS = {
  // 套餐
  PACKAGES: '/h5/packages',
  HOT_PACKAGES: '/h5/packages/hot',
  RECHARGE_PACKAGES: '/h5/packages/recharge',
  PACKAGE_LOCATIONS: '/h5/packages/locations',

  // eSIM
  ESIM_BY_ICCID: (iccid: string) => `/h5/esim/${iccid}`,
  ESIM_PREVIEW: (iccid: string) => `/h5/esim/preview/${iccid}`,
  ESIM_USAGE: (iccid: string) => `/h5/esim/${iccid}/usage`,
  ESIM_ENABLE: (iccid: string) => `/h5/esim/${iccid}/enable`,

  // 充值订单
  TOPUP_ORDERS: '/h5/orders/topup',

  // 充值支付
  RECHARGE_PAY: (rechargeId: number) => `/h5/recharge/${rechargeId}/pay`,
  RECHARGE_DETAIL: (rechargeId: number) => `/h5/recharge/${rechargeId}`,
} as const;

// ─── 套餐服务 ────────────────────────────────────────────────────────────

export const packageService = {
  /**
   * 获取套餐列表
   * @param params 筛选参数
   */
  async getPackages(params?: PackageListParams): Promise<{ packages: PackageDto[] }> {
    return get<{ packages: PackageDto[] }>(ENDPOINTS.PACKAGES, params as Record<string, unknown>);
  },

  /**
   * 获取热门套餐
   * @param limit 返回数量
   */
  async getHotPackages(limit?: number): Promise<{ packages: PackageDto[] }> {
    return get<{ packages: PackageDto[] }>(ENDPOINTS.HOT_PACKAGES, { limit });
  },

  /**
   * Fetch the top-up / recharge catalogue for an existing SIM.
   *
   * Backend accepts `supplier_type`:
   *   - `'esimaccess'` (default) — digital eSIMs (Red Tea templates)
   *   - `'pccw'` — physical SIMs (PCCW recharge templates, respects
   *               per-ICCID whitelists)
   * Pass the matching supplier when the SIM was provisioned by PCCW,
   * otherwise the backend will return an empty / mismatched list.
   */
  async getRechargePackages(
    iccid: string,
    supplierType?: 'esimaccess' | 'pccw',
  ): Promise<{ packages: PackageDto[] }> {
    const params: Record<string, unknown> = { iccid };
    if (supplierType) params.supplier_type = supplierType;
    return get<{ packages: PackageDto[] }>(ENDPOINTS.RECHARGE_PACKAGES, params);
  },

  /**
   * 获取可用地区列表
   * 支持两种响应格式:
   * 格式1 (后端返回): { single_countries: [], multi_countries: [] }
   * 格式2 (标准化): { locations: [{ code, name, package_count }] }
   */
  async getLocations(): Promise<{
    locations?: Array<{
      code: string;
      name: string;
      packageCount: number;
    }>;
    singleCountries?: Array<{
      code: string;
      name?: string;
      packageCount?: number;
    }>;
    multiCountries?: Array<{
      code: string;
      name?: string;
      packageCount?: number;
    }>;
    // snake_case 格式 (后端实际返回)
    single_countries?: Array<{
      code: string;
      name: string;
      package_count?: number;
    }>;
    multi_countries?: Array<{
      code: string;
      name: string;
      package_count?: number;
    }>;
  }> {
    return get(ENDPOINTS.PACKAGE_LOCATIONS);
  },
};

// ─── eSIM 服务 ────────────────────────────────────────────────────────────

export const esimService = {
  /**
   * Fetch the public SIM preview (used during bind / registration).
   *
   * `supplierType` controls which provider backs the lookup:
   *   - `'esimaccess'` (default) — Red Tea / EsimAccess, i.e. our digital
   *     eSIM catalogue; used on the eSIM install flow.
   *   - `'pccw'` — PCCW IoT-M, our physical SIM supplier. Physical SIMs
   *     ship preloaded with data, so the H5 "Bind your SIM" screen should
   *     always pass `'pccw'` to hit the correct backend service
   *     (`PccwPreviewService`) and surface the preloaded plan + carrier
   *     balance for top-up purposes.
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
   * POST /h5/orders/topup
   * @param data 充值参数
   */
  async topup(data: TopupRequest): Promise<TopupResponse> {
    return post<TopupResponse>(ENDPOINTS.TOPUP_ORDERS, data);
  },

  /**
   * 创建充值支付会话
   * POST /h5/recharge/{recharge_id}/pay
   * @param rechargeId 充值记录 ID
   * @param data 支付参数
   */
  async createRechargePayment(rechargeId: number, data?: CreatePaymentSessionRequest): Promise<CreatePaymentSessionResponse> {
    return post<CreatePaymentSessionResponse>(ENDPOINTS.RECHARGE_PAY(rechargeId), data || {});
  },

  /**
   * 查询充值记录详情
   * GET /h5/recharge/{recharge_id}
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
  async enableProfile(iccid: string): Promise<{ status: string }> {
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