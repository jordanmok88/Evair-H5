/**
 * API 服务统一导出
 * 后端就绪后，可直接从本模块导入使用
 */

// 导出客户端工具
export {
  // 配置
  setBaseUrl,
  getBaseUrl,

  // Token 管理
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,

  // 请求方法
  request,
  get,
  post,
  put,
  patch,
  del,

  // 拦截器
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,

  // 错误类
  ApiError,

  // 命名转换工具
  toSnakeCase,
  toCamelCase,
} from './client';

// 导出类型
export * from './types';

// 导出服务
export { authService } from './auth';
export { userService } from './user';
export { orderService } from './order';
export { packageService, esimService } from './esim';
export { paymentService } from './payment';
export { activationService } from './activation';
export { appSimService } from './simApp';
export type {
  AppSimDetail,
  UpdateAutoRenewRequest,
  UpdateAutoRenewEnableRequest,
  UpdateAutoRenewDisableRequest,
} from './simApp';
export type {
  ClaimState,
  ActivationPreviewData,
  ActivationPreviewPackage,
  PreviewResult,
  BindSimRequest as ActivationBindSimRequest,
  BindSimResponse as ActivationBindSimResponse,
} from './activation';
export type {
  SetupIntentSession,
  CreateSetupIntentRequest,
} from './payment';

// 导入服务用于默认导出
import { authService } from './auth';
import { userService } from './user';
import { orderService } from './order';
import { packageService, esimService } from './esim';
import { paymentService } from './payment';
import { activationService } from './activation';
import { appSimService } from './simApp';

// 默认导出所有服务
export default {
  auth: authService,
  user: userService,
  order: orderService,
  package: packageService,
  esim: esimService,
  payment: paymentService,
  activation: activationService,
  appSim: appSimService,
};