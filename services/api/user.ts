/**
 * 用户服务模块
 * 处理用户信息、SIM卡管理、地址管理等
 */

import { get, post, put, del } from './client';
import type {
  UserDto,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserSimDto,
  BindSimRequest,
  UnbindSimRequest,
  AddressDto,
  CreateAddressRequest,
  UpdateAddressRequest,
  AddressCreatedResponse,
  AddressUpdatedResponse,
  AddressDeletedResponse,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  // 用户信息
  PROFILE: '/app/users/me',
  PASSWORD: '/app/users/password',

  // SIM 卡管理
  SIMS: '/app/users/sims',
  BIND_SIM: '/app/users/bind-sim',
  UNBIND_SIM: '/app/users/unbind-sim',

  // 地址管理
  ADDRESSES: '/app/users/addresses',
  ADDRESS_BY_ID: (id: string) => `/app/users/addresses/${encodeURIComponent(id)}`,
  ADDRESS_DEFAULT: (id: string) => `/app/users/addresses/${encodeURIComponent(id)}/default`,
} as const;

// ─── 用户信息服务 ────────────────────────────────────────────────────────

export const userService = {
  // ============ 用户信息 ============

  /**
   * 获取当前用户信息
   */
  async getProfile(): Promise<UserDto> {
    return get<UserDto>(ENDPOINTS.PROFILE);
  },

  /**
   * 更新用户信息
   * @param data 要更新的字段
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserDto> {
    return put<UserDto>(ENDPOINTS.PROFILE, data);
  },

  /**
   * 修改密码
   * @param data 当前密码和新密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await put(ENDPOINTS.PASSWORD, data);
  },

  // ============ SIM 卡管理 ============

  /**
   * 获取用户的 SIM 卡绑定列表
   * App-tier returns { list: AppUserSimResource[] } (no pagination envelope).
   */
  async getSims(params?: {
    status?: string;
  }): Promise<{ list: UserSimDto[] }> {
    return get<{ list: UserSimDto[] }>(ENDPOINTS.SIMS, params);
  },

  /**
   * 绑定 SIM 卡
   * App-tier returns AppUserSimResource (code "201").
   */
  async bindSim(data: BindSimRequest): Promise<UserSimDto> {
    return post<UserSimDto>(ENDPOINTS.BIND_SIM, data);
  },

  /**
   * 解绑 SIM 卡
   * App-tier returns { data: null } (code "200").
   */
  async unbindSim(data: UnbindSimRequest): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/14d3c5f8-7d82-4f89-8791-2a5c027b03b6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '243df2' },
      body: JSON.stringify({
        sessionId: '243df2',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'user.ts:unbindSim',
        message: 'outbound unbind body (camelCase keys before client snake_case)',
        data: { keys: Object.keys(data) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    await post(ENDPOINTS.UNBIND_SIM, data);
  },

  // ============ 地址管理 ============

  /**
   * 获取用户地址列表（data 为 { addresses } 或直接数组时均可解析）
   */
  async getAddresses(): Promise<AddressDto[]> {
    const raw = await get<unknown>(ENDPOINTS.ADDRESSES);
    if (Array.isArray(raw)) {
      return raw as AddressDto[];
    }
    if (raw && typeof raw === 'object' && 'addresses' in raw) {
      const { addresses } = raw as { addresses: unknown };
      return Array.isArray(addresses) ? (addresses as AddressDto[]) : [];
    }
    return [];
  },

  /**
   * 添加地址（后端 data 多为摘要字段，合并请求体为完整 AddressDto）
   */
  async createAddress(data: CreateAddressRequest): Promise<AddressDto> {
    const raw = await post<AddressCreatedResponse & Partial<AddressDto>>(ENDPOINTS.ADDRESSES, data);
    return {
      id: raw.id,
      recipientName: raw.recipientName ?? data.recipientName,
      phone: raw.phone ?? data.phone,
      addressLine1: raw.addressLine1 ?? data.addressLine1,
      addressLine2: raw.addressLine2 ?? data.addressLine2 ?? null,
      city: raw.city ?? data.city,
      state: raw.state ?? data.state ?? null,
      postalCode: raw.postalCode ?? data.postalCode,
      country: raw.country ?? data.country,
      isDefault: raw.isDefault ?? data.isDefault ?? false,
    };
  },

  /**
   * 更新地址（规范 2.2.9：data 含 id、updatedAt）
   */
  async updateAddress(id: string, data: UpdateAddressRequest): Promise<AddressUpdatedResponse> {
    return put<AddressUpdatedResponse>(ENDPOINTS.ADDRESS_BY_ID(id), data);
  },

  /**
   * 删除地址
   */
  async deleteAddress(id: string): Promise<AddressDeletedResponse> {
    return del<AddressDeletedResponse>(ENDPOINTS.ADDRESS_BY_ID(id));
  },

  /**
   * 设置默认地址
   */
  async setDefaultAddress(id: string): Promise<AddressUpdatedResponse> {
    return put<AddressUpdatedResponse>(ENDPOINTS.ADDRESS_DEFAULT(id));
  },
};

export default userService;