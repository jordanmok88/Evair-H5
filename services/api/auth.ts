/**
 * 认证服务模块
 * 处理用户登录、注册、登出、Token 刷新等
 */

import { post, setAccessToken, setRefreshToken, clearTokens, getAccessToken, getRefreshToken } from './client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  LOGIN: '/h5/auth/login',
  REGISTER: '/h5/auth/register',
  LOGOUT: '/h5/auth/logout',
  REFRESH: '/h5/auth/refresh',
  FORGOT_PASSWORD: '/h5/auth/forgot-password',
  RESET_PASSWORD: '/h5/auth/reset-password',
} as const;

// ─── 认证服务 ────────────────────────────────────────────────────────────

export const authService = {
  /**
   * 用户登录
   * @param credentials 登录凭据
   * @returns 认证响应（用户信息和 Token）
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await post<AuthResponse>(ENDPOINTS.LOGIN, credentials, { skipAuth: true });

    // 存储 Token
    setAccessToken(response.token);
    setRefreshToken(response.refreshToken);

    return response;
  },

  /**
   * 用户注册
   * @param data 注册信息
   * @returns 认证响应（用户信息和 Token）
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await post<AuthResponse>(ENDPOINTS.REGISTER, data, { skipAuth: true });

    // 存储 Token
    setAccessToken(response.token);
    setRefreshToken(response.refreshToken);

    return response;
  },

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await post(ENDPOINTS.LOGOUT);
    } finally {
      // 无论请求成功与否，都清除本地 Token
      clearTokens();
    }
  },

  /**
   * 刷新 Token
   * @returns 新的 Token 信息
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await post<RefreshTokenResponse>(
      ENDPOINTS.REFRESH,
      { refreshToken } as RefreshTokenRequest,
      { skipAuth: true }
    );

    // 更新存储的 Token
    setAccessToken(response.token);
    setRefreshToken(response.refreshToken);

    return response;
  },

  /**
   * 发送找回密码邮件
   * @param data 邮箱地址
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await post(ENDPOINTS.FORGOT_PASSWORD, data, { skipAuth: true });
  },

  /**
   * 重置密码
   * @param data 重置密码所需的 Token 和新密码
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await post(ENDPOINTS.RESET_PASSWORD, data, { skipAuth: true });
  },

  /**
   * 检查当前是否已登录
   */
  isLoggedIn(): boolean {
    return !!getAccessToken();
  },

  /**
   * 获取当前 Access Token
   */
  getToken(): string | null {
    return getAccessToken();
  },
};

export default authService;