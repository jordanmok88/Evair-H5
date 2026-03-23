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
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  // 套餐
  PACKAGES: '/h5/packages',
  HOT_PACKAGES: '/h5/packages/hot',
  RECHARGE_PACKAGES: '/h5/packages/recharge',
  PACKAGE_LOCATIONS: '/h5/packages/locations',

  // eSIM
  ESIM_BY_ICCID: (iccid: string) => `/h5/esim/${iccid}`,
  ESIM_USAGE: (iccid: string) => `/h5/esim/${iccid}/usage`,
  ESIM_TOPUP: (iccid: string) => `/h5/esim/${iccid}/topup`,
  ESIM_ENABLE: (iccid: string) => `/h5/esim/${iccid}/enable`,
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
   * 获取充值套餐（针对特定 eSIM）
   * @param iccid eSIM ICCID
   */
  async getRechargePackages(iccid: string): Promise<{ packages: PackageDto[] }> {
    return get<{ packages: PackageDto[] }>(ENDPOINTS.RECHARGE_PACKAGES, { iccid });
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
   * eSIM 充值
   * @param iccid eSIM ICCID
   * @param data 充值套餐信息
   */
  async topup(iccid: string, data: TopupRequest): Promise<TopupResponse> {
    return post<TopupResponse>(ENDPOINTS.ESIM_TOPUP(iccid), data);
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