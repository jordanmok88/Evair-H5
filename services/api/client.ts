/**
 * API 核心请求客户端
 * 提供 Token 管理、请求拦截、错误处理等功能
 */

import type { ApiResponse, ApiErrorCode } from './types';

// ─── 命名转换工具 ──────────────────────────────────────────────────────────

/**
 * camelCase 转 snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * snake_case 转 camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 递归转换对象键名
 */
function transformKeys<T>(obj: T, transformer: (key: string) => string): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transformer)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[transformer(key)] = transformKeys(value, transformer);
    }
    return result as T;
  }

  return obj;
}

/**
 * 将 camelCase 对象转换为 snake_case（用于请求）
 */
export function toSnakeCase<T>(obj: T): T {
  return transformKeys(obj, camelToSnake);
}

/**
 * 将 snake_case 对象转换为 camelCase（用于响应）
 */
export function toCamelCase<T>(obj: T): T {
  return transformKeys(obj, snakeToCamel);
}

// ─── 配置 ────────────────────────────────────────────────────────────────

// 开发环境使用本地测试服务器，生产环境通过环境变量配置
const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://evair.zhhwxt.cn/api/v1';
const TOKEN_KEY = 'evair_access_token';
const REFRESH_TOKEN_KEY = 'evair_refresh_token';

let baseUrl = DEFAULT_BASE_URL;

/**
 * 设置 API 基础 URL
 */
export function setBaseUrl(url: string): void {
  baseUrl = url;
}

/**
 * 获取当前 API 基础 URL
 */
export function getBaseUrl(): string {
  return baseUrl;
}

// ─── Token 管理 ──────────────────────────────────────────────────────────

/**
 * 存储访问 Token
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 获取访问 Token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 存储刷新 Token
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/**
 * 获取刷新 Token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 清除所有 Token
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// ─── API 错误类 ──────────────────────────────────────────────────────────

/**
 * Test whether a Laravel response `code` represents success.
 *
 * The /v1/app/* tier returns `'200'` (read) or `'201'` (created) on
 * success; the legacy /h5/* tier returns numeric `0`. We accept all three
 * so a single H5 client can talk to both tiers without per-call
 * branching. Anything else (including `null`, `undefined`, `false`,
 * `'AUTH_001'`, `1001`, etc.) is a failure.
 */
export function isSuccessApiCode(code: unknown): boolean {
  if (code === 0 || code === '0') return true;
  if (code === '200' || code === '201') return true;
  return false;
}

export class ApiError extends Error {
  code: ApiErrorCode | string;
  httpStatus: number;
  data?: unknown;

  constructor(
    code: ApiErrorCode | string,
    message: string,
    httpStatus: number,
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }

  /**
   * Auth-related codes from both tiers.
   *
   * Legacy /h5: numeric -3 (UNAUTHORIZED), 1021 (INVALID_REFRESH_TOKEN),
   * 1022 (TOKEN_EXPIRED).
   *
   * /v1/app: string 'AUTH_001' (refresh-token invalid / account disabled).
   */
  isAuthError(): boolean {
    return (
      this.code === -3 ||
      this.code === 1021 ||
      this.code === 1022 ||
      this.code === 'AUTH_001'
    );
  }

  /**
   * 是否为网络错误
   */
  isNetworkError(): boolean {
    return this.httpStatus === 0;
  }
}

// ─── 请求拦截器类型 ──────────────────────────────────────────────────────

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiError) => void | Promise<void>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

/**
 * 添加请求拦截器
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

/**
 * 添加响应拦截器
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor);
}

/**
 * 添加错误拦截器
 */
export function addErrorInterceptor(interceptor: ErrorInterceptor): void {
  errorInterceptors.push(interceptor);
}

// ─── 请求配置类型 ────────────────────────────────────────────────────────

export interface RequestConfig extends RequestInit {
  params?: Record<string, unknown>;
  skipAuth?: boolean;
}

// ─── Token 刷新状态 ──────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Refresh the access token via POST /v1/app/auth/refresh.
 *
 * Both tiers (`/h5/auth/login` and `/app/auth/login`) write to the same
 * underlying `user_tokens` table with `TYPE_REFRESH`, so a refresh_token
 * issued by either flow is redeemable here. We standardize on the /app
 * endpoint because it's the one the rest of the activation funnel + the
 * Flutter native app target.
 *
 * Updates local storage in place; throws an `ApiError` on failure so the
 * caller (`request()` 401 handler) can clear tokens and surface the
 * error to the UI.
 */
async function refreshAccessToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError(-3, 'No refresh token', 401);
  }

  // Direct fetch to avoid circular import (authService imports from client).
  const url = `${baseUrl}/app/auth/refresh`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Network error — keep the token, let the caller decide whether to
    // retry. Don't clear so the user isn't logged out by transient WiFi.
    throw new ApiError(-3, 'Network error during token refresh', 0);
  }

  // Note: body shape is intentionally permissive. /h5 returns
  // `{code:0,data:{token,refresh_token}}`, /v1/app returns
  // `{code:'200',data:{token,refresh_token,expires_in}}`. We accept
  // either via isSuccessApiCode().
  let body: {
    code?: number | string;
    data?: { token?: string; access_token?: string; refresh_token?: string };
  };
  try {
    body = await res.json();
  } catch {
    clearTokens();
    throw new ApiError(-3, 'Invalid refresh response', res.status);
  }

  // Refresh-token invalid / expired / account disabled — server returns
  // 401 + `code: 'AUTH_001'` (or numeric 1021/1022 on the legacy tier).
  // Either way, force re-login.
  const newToken = body.data?.token ?? body.data?.access_token;
  if (! isSuccessApiCode(body.code) || ! newToken) {
    clearTokens();
    throw new ApiError(-3, 'Token refresh failed', res.status);
  }

  setAccessToken(newToken);
  if (body.data?.refresh_token) {
    setRefreshToken(body.data.refresh_token);
  }
}

// ─── 核心请求方法 ────────────────────────────────────────────────────────

/**
 * 发起 API 请求
 */
export async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  // 应用请求拦截器
  let finalConfig = config;
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  // 构建完整 URL
  let url = `${baseUrl}${endpoint}`;

  // 处理查询参数（转换为 snake_case）
  if (finalConfig.params) {
    const searchParams = new URLSearchParams();
    const snakeParams = toSnakeCase(finalConfig.params);
    for (const [key, value] of Object.entries(snakeParams)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // 构建请求头
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...finalConfig.headers,
  };

  // 添加认证头
  if (!finalConfig.skipAuth) {
    const token = getAccessToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // 发起请求
  let response: Response;
  try {
    response = await fetch(url, {
      ...finalConfig,
      headers,
    });
  } catch (err) {
    const error = new ApiError(-1, 'Network error', 0);
    for (const interceptor of errorInterceptors) {
      await interceptor(error);
    }
    throw error;
  }

  // 应用响应拦截器
  for (const interceptor of responseInterceptors) {
    response = await interceptor(response);
  }

  // 处理 401 未授权
  if (response.status === 401 && !finalConfig.skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      // 重试原请求
      return request<T>(endpoint, config);
    } catch {
      clearTokens();
      const error = new ApiError(-3, 'Unauthorized', 401);
      for (const interceptor of errorInterceptors) {
        await interceptor(error);
      }
      throw error;
    }
  }

  // 解析响应体
  let body: ApiResponse<T>;
  try {
    body = await response.json();
  } catch {
    const error = new ApiError(-1, 'Invalid response format', response.status);
    for (const interceptor of errorInterceptors) {
      await interceptor(error);
    }
    throw error;
  }

  // 将响应数据从 snake_case 转换为 camelCase
  body = toCamelCase(body);

  // 检查业务错误码 — accepts numeric `0` (legacy /h5/*) and string
  // `'200'` / `'201'` (new /v1/app/*). See {@link isSuccessApiCode}.
  if (! isSuccessApiCode(body.code)) {
    const error = new ApiError(
      body.code as ApiErrorCode | string,
      body.msg || 'Unknown error',
      response.status,
      body.data
    );
    for (const interceptor of errorInterceptors) {
      await interceptor(error);
    }
    throw error;
  }

  return body.data;
}

// ─── 便捷方法 ────────────────────────────────────────────────────────────

/**
 * GET 请求
 */
export function get<T>(endpoint: string, params?: RequestConfig['params'], config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'GET', params });
}

/**
 * POST 请求
 */
export function post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  // 将请求体从 camelCase 转换为 snake_case
  const snakeData = data ? toSnakeCase(data) : undefined;
  return request<T>(endpoint, {
    ...config,
    method: 'POST',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

/**
 * PUT 请求
 */
export function put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  // 将请求体从 camelCase 转换为 snake_case
  const snakeData = data ? toSnakeCase(data) : undefined;
  return request<T>(endpoint, {
    ...config,
    method: 'PUT',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

/**
 * DELETE 请求
 */
export function del<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'DELETE' });
}

/**
 * PATCH request — used by the Activation Funnel auto-renew toggle and
 * other partial-update surfaces. Body keys are converted from
 * camelCase → snake_case to match the Laravel form-request expectations.
 */
export function patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  const snakeData = data ? toSnakeCase(data) : undefined;
  return request<T>(endpoint, {
    ...config,
    method: 'PATCH',
    body: snakeData ? JSON.stringify(snakeData) : undefined,
  });
}

// ─── 默认拦截器设置 ──────────────────────────────────────────────────────

// 默认错误拦截器：在控制台打印错误
addErrorInterceptor((error) => {
  if (error.isAuthError()) {
    // 可以在这里触发登录弹窗或跳转登录页
    console.warn('[API] Auth error:', error.message);
  } else {
    console.error('[API] Error:', error.code, error.message);
  }
});