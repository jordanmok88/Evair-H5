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
  PaginatedData,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  // 用户信息
  PROFILE: '/h5/user/profile',
  PASSWORD: '/h5/user/password',

  // SIM 卡管理
  SIMS: '/h5/user/sims',
  BIND_SIM: '/h5/user/sims/bind',
  UNBIND_SIM: '/h5/user/sims/unbind',

  // 地址管理
  ADDRESSES: '/h5/user/addresses',
  ADDRESS_BY_ID: (id: string) => `/h5/user/addresses/${id}`,
  SET_DEFAULT_ADDRESS: (id: string) => `/h5/user/addresses/${id}/default`,
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
   * 获取用户的 SIM 卡列表
   * @param status 状态筛选
   * @param page 页码
   * @param size 每页数量
   */
  async getSims(params?: {
    status?: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    page?: number;
    size?: number;
  }): Promise<PaginatedData<UserSimDto>> {
    return get<PaginatedData<UserSimDto>>(ENDPOINTS.SIMS, params);
  },

  /**
   * 绑定 SIM 卡
   * @param data ICCID 和激活码
   */
  async bindSim(data: BindSimRequest): Promise<{ success: boolean; sim: UserSimDto }> {
    return post<{ success: boolean; sim: UserSimDto }>(ENDPOINTS.BIND_SIM, data);
  },

  /**
   * 解绑 SIM 卡
   * @param data ICCID
   */
  async unbindSim(data: UnbindSimRequest): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(ENDPOINTS.UNBIND_SIM, data);
  },

  // ============ 地址管理 ============

  /**
   * 获取用户地址列表
   */
  async getAddresses(): Promise<AddressDto[]> {
    const response = await get<{ addresses: AddressDto[] }>(ENDPOINTS.ADDRESSES);
    return response.addresses;
  },

  /**
   * 添加地址
   * @param data 地址信息
   */
  async createAddress(data: CreateAddressRequest): Promise<AddressDto> {
    return post<AddressDto>(ENDPOINTS.ADDRESSES, data);
  },

  /**
   * 更新地址
   * @param id 地址 ID
   * @param data 要更新的字段
   */
  async updateAddress(id: string, data: UpdateAddressRequest): Promise<AddressDto> {
    return put<AddressDto>(ENDPOINTS.ADDRESS_BY_ID(id), data);
  },

  /**
   * 删除地址
   * @param id 地址 ID
   */
  async deleteAddress(id: string): Promise<void> {
    await del(ENDPOINTS.ADDRESS_BY_ID(id));
  },

  /**
   * 设置默认地址
   * @param id 地址 ID
   */
  async setDefaultAddress(id: string): Promise<void> {
    await put(ENDPOINTS.SET_DEFAULT_ADDRESS(id));
  },
};

export default userService;