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
  del,

  // 拦截器
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,

  // 错误类
  ApiError,
} from './client';

// 导出类型
export * from './types';

// 导出服务
export { authService } from './auth';
export { userService } from './user';
export { orderService } from './order';
export { packageService, esimService } from './esim';
export { paymentService } from './payment';

// 默认导出所有服务
export default {
  auth: authService,
  user: userService,
  order: orderService,
  package: packageService,
  esim: esimService,
  payment: paymentService,
};