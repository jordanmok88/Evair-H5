/**
 * API 测试页面
 * 用于测试所有后端 API 接口
 * 访问方式：URL 添加 #api-test
 */

import { useState, useEffect } from 'react';
import {
  authService,
  userService,
  orderService,
  packageService,
  esimService,
  paymentService,
  setBaseUrl,
  getBaseUrl,
  clearTokens,
  isAuthenticated,
  ApiError,
} from '../services/api';
import type {
  LoginRequest,
  RegisterRequest,
  CreateEsimOrderRequest,
  CreatePhysicalOrderRequest,
  CreatePaymentRequest,
  ValidateCouponRequest,
  TopupRequest,
  BindSimRequest,
  UpdateProfileRequest,
  CreateAddressRequest,
  OrderStatus,
} from '../services/api/types';

// 服务模块配置
const MODULES = {
  auth: {
    name: '认证服务',
    methods: {
      login: { name: '登录', params: ['email', 'password'] },
      register: { name: '注册', params: ['email', 'password', 'name'] },
      logout: { name: '登出', params: [] },
      refreshToken: { name: '刷新Token', params: [] },
      forgotPassword: { name: '找回密码', params: ['email'] },
      resetPassword: { name: '重置密码', params: ['token', 'password'] },
      isLoggedIn: { name: '检查登录状态', params: [] },
    },
  },
  user: {
    name: '用户服务',
    methods: {
      getProfile: { name: '获取用户信息', params: [] },
      updateProfile: { name: '更新用户信息', params: ['name?', 'phone?'] },
      changePassword: { name: '修改密码', params: ['currentPassword', 'password', 'passwordConfirmation'] },
      getSims: { name: '获取SIM卡列表', params: ['status?', 'page?', 'size?'] },
      bindSim: { name: '绑定SIM卡', params: ['iccid', 'activationCode?'] },
      unbindSim: { name: '解绑SIM卡', params: ['iccid'] },
      getAddresses: { name: '获取地址列表', params: [] },
      createAddress: { name: '添加地址', params: ['recipientName', 'phone', 'addressLine1', 'city', 'postalCode', 'country'] },
      updateAddress: { name: '更新地址', params: ['addressId', 'recipientName?', 'phone?', 'addressLine1?', 'city?', 'postalCode?', 'country?'] },
      deleteAddress: { name: '删除地址', params: ['addressId'] },
      setDefaultAddress: { name: '设置默认地址', params: ['addressId'] },
    },
  },
  package: {
    name: '套餐服务',
    methods: {
      getPackages: { name: '获取套餐列表', params: ['locationCode?', 'type?', 'page?', 'size?'] },
      getHotPackages: { name: '获取热门套餐', params: ['limit?'] },
      getRechargePackages: { name: '获取充值套餐', params: ['iccid'] },
      getLocations: { name: '获取可用地区', params: [] },
    },
  },
  order: {
    name: '订单服务',
    methods: {
      createEsimOrder: { name: '创建eSIM订单', params: ['packageCode', 'email', 'quantity?'] },
      createPhysicalOrder: { name: '创建实体SIM订单', params: ['productId', 'quantity', 'email'] },
      createTopupOrder: { name: '创建充值订单', params: ['iccid', 'packageCode', 'amount'] },
      getOrders: { name: '获取订单列表', params: ['status?', 'type?', 'page?', 'size?'] },
      getOrderDetail: { name: '获取订单详情', params: ['orderNo'] },
      cancelOrder: { name: '取消订单', params: ['orderNo', 'reason?'] },
      requestRefund: { name: '申请退款', params: ['orderNo', 'reason', 'amount?'] },
      getTracking: { name: '获取物流信息', params: ['orderNo'] },
      pollOrderStatus: { name: '轮询订单状态', params: ['orderNo', 'interval?', 'maxAttempts?'] },
    },
  },
  esim: {
    name: 'eSIM服务',
    methods: {
      getDetail: { name: '获取eSIM详情', params: ['iccid'] },
      getUsage: { name: '查询用量', params: ['iccid', 'daily?', 'page?', 'size?'] },
      topup: { name: 'eSIM充值', params: ['iccid', 'packageCode', 'amount'] },
    },
  },
  payment: {
    name: '支付服务',
    methods: {
      createPayment: { name: '创建支付会话', params: ['orderNo', 'method', 'successUrl', 'cancelUrl'] },
      getPaymentStatus: { name: '查询支付状态', params: ['paymentId'] },
      validateCoupon: { name: '验证优惠券', params: ['code', 'orderNo'] },
      getCoupons: { name: '获取优惠券列表', params: [] },
    },
  },
} as const;

type ModuleKey = keyof typeof MODULES;
type MethodKey<M extends ModuleKey> = keyof typeof MODULES[M]['methods'];

// 默认参数值
const DEFAULT_PARAMS: Record<string, string> = {
  email: 'test@example.com',
  password: 'Test123456',
  name: 'Test User',
  phone: '+1234567890',
  iccid: '8985200000000000001',
  packageCode: 'PKG-US-5GB-30D',
  productId: 'SIM-US-10GB-30D',
  orderNo: 'ORD-20260317-0001',
  paymentId: 'pi_xxx',
  code: 'SAVE10',
  quantity: '1',
  amount: '1999',
  limit: '10',
  page: '1',
  size: '20',
  status: 'ACTIVE',
  type: 'BASE',
  locationCode: 'US',
  method: 'STRIPE',
  successUrl: 'https://evairsim.com/order/success',
  cancelUrl: 'https://evairsim.com/order/cancel',
  reason: 'Test reason',
  currentPassword: 'OldPassword123',
  newPassword: 'NewPassword456',
  passwordConfirmation: 'NewPassword456',
  token: 'reset_token_here',
  recipientName: 'John Doe',
  addressLine1: '123 Main St',
  city: 'San Francisco',
  postalCode: '94102',
  country: 'US',
  addressId: 'addr_001',
};

export default function ApiTestPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('auth');
  const [activeMethod, setActiveMethod] = useState<string>('login');
  const [params, setParams] = useState<Record<string, string>>({});
  const [baseUrlInput, setBaseUrlInput] = useState(getBaseUrl());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; data: unknown } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);
  const [savedRecords, setSavedRecords] = useState(0);

  // 监听 Token 变化
  useEffect(() => {
    const checkAuth = () => setLoggedIn(isAuthenticated());
    // 登录/登出后更新状态
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // 监听 Vite 插件消息
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on('api-response-saved', (data: { totalRecords: number }) => {
        setSavedRecords(data.totalRecords);
        addLog(`响应已保存 (共 ${data.totalRecords} 条)`);
      });

      import.meta.hot.on('api-response-cleared', () => {
        setSavedRecords(0);
        addLog('已清空所有保存的响应');
      });
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleParamChange = (key: string, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdateBaseUrl = () => {
    setBaseUrl(baseUrlInput);
    addLog(`Base URL 已更新为: ${baseUrlInput}`);
  };

  const handleClearTokens = () => {
    clearTokens();
    setLoggedIn(false);
    addLog('Token 已清除');
    setResult({ type: 'success', data: { message: 'Token cleared' } });
  };

  const handleClearResponses = () => {
    if (import.meta.hot) {
      import.meta.hot.send('api-response-clear', {});
    }
  };

  // 捕获响应到 Vite 插件
  const captureResponse = (response: unknown, statusCode: number = 200) => {
    if (import.meta.hot) {
      import.meta.hot.send('api-response-capture', {
        module: activeModule,
        method: activeMethod,
        endpoint: `${activeModule}/${activeMethod}`,
        statusCode,
        response,
      });
    }
  };

  // 登录成功后更新状态
  const handleExecute = async () => {
    setLoading(true);
    setResult(null);

    try {
      let response: unknown;

      switch (activeModule) {
        case 'auth':
          response = await executeAuthMethod(activeMethod, params);
          break;
        case 'user':
          response = await executeUserMethod(activeMethod, params);
          break;
        case 'package':
          response = await executePackageMethod(activeMethod, params);
          break;
        case 'order':
          response = await executeOrderMethod(activeMethod, params);
          break;
        case 'esim':
          response = await executeEsimMethod(activeMethod, params);
          break;
        case 'payment':
          response = await executePaymentMethod(activeMethod, params);
          break;
      }

      setResult({ type: 'success', data: response });
      addLog(`${MODULES[activeModule].methods[activeMethod as MethodKey<typeof activeModule>]?.name} 成功`);

      // 捕获成功响应
      captureResponse(response, 200);

      // 登录成功后更新状态
      if (activeModule === 'auth' && (activeMethod === 'login' || activeMethod === 'register')) {
        setLoggedIn(true);
      }
    } catch (err) {
      const error = err as ApiError | Error;
      setResult({ type: 'error', data: error });
      addLog(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 原 handleExecute 已合并到上面，移除重复定义

  const currentMethodConfig = MODULES[activeModule]?.methods[activeMethod as MethodKey<typeof activeModule>];

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>API 测试页面</h1>

      {/* 配置区域 */}
      <div style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>状态:</strong> {loggedIn ? '已登录' : '未登录'}
            <span style={{ marginLeft: 20 }}>
              <strong>已保存响应:</strong> {savedRecords} 条
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#666' }}>
            响应保存至: docs/api-responses/
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            placeholder="Base URL"
            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <button onClick={handleUpdateBaseUrl} style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            更新URL
          </button>
          <button onClick={handleClearTokens} style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            清除Token
          </button>
          <button onClick={handleClearResponses} style={{ padding: '8px 16px', background: '#FF9800', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            清空响应
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* 左侧：模块和方法选择 */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <h3 style={{ marginBottom: 10 }}>服务模块</h3>
          {(Object.keys(MODULES) as ModuleKey[]).map(moduleKey => (
            <div key={moduleKey} style={{ marginBottom: 10 }}>
              <div
                onClick={() => {
                  setActiveModule(moduleKey);
                  setActiveMethod(Object.keys(MODULES[moduleKey].methods)[0]);
                  setParams({});
                }}
                style={{
                  padding: '8px 12px',
                  background: activeModule === moduleKey ? '#e3f2fd' : '#fff',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: activeModule === moduleKey ? 'bold' : 'normal',
                }}
              >
                {MODULES[moduleKey].name}
              </div>
              {activeModule === moduleKey && (
                <div style={{ marginLeft: 10, marginTop: 5 }}>
                  {Object.keys(MODULES[moduleKey].methods).map(methodKey => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const methodConfig = (MODULES[moduleKey].methods as any)[methodKey];
                    return (
                      <div
                        key={methodKey}
                        onClick={() => {
                          setActiveMethod(methodKey);
                          setParams({});
                        }}
                        style={{
                          padding: '4px 8px',
                          background: activeMethod === methodKey ? '#bbdefb' : 'transparent',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        {methodConfig?.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 右侧：参数输入和结果 */}
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 10 }}>
            {MODULES[activeModule].name} - {currentMethodConfig?.name}
          </h3>

          {/* 参数输入 */}
          <div style={{ marginBottom: 15, padding: 15, background: '#fafafa', borderRadius: 8 }}>
            {currentMethodConfig?.params.length === 0 ? (
              <div style={{ color: '#666' }}>无需参数</div>
            ) : (
              currentMethodConfig?.params.map(param => {
                const key = param.replace('?', '');
                const optional = param.endsWith('?');
                return (
                  <div key={param} style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>
                      {key} {optional && <span style={{ color: '#999' }}>(可选)</span>}
                    </label>
                    <input
                      type="text"
                      value={params[key] ?? DEFAULT_PARAMS[key] ?? ''}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      placeholder={key}
                      style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                );
              })
            )}

            <button
              onClick={handleExecute}
              disabled={loading}
              style={{
                width: '100%',
                padding: 12,
                background: loading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16,
              }}
            >
              {loading ? '执行中...' : '执行'}
            </button>
          </div>

          {/* 结果显示 */}
          {result && (
            <div style={{ marginBottom: 15 }}>
              <h4>响应结果:</h4>
              <pre
                style={{
                  padding: 15,
                  background: result.type === 'success' ? '#e8f5e9' : '#ffebee',
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 300,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}

          {/* 日志 */}
          <div>
            <h4>操作日志:</h4>
            <div
              style={{
                padding: 15,
                background: '#263238',
                color: '#4CAF50',
                borderRadius: 8,
                maxHeight: 200,
                overflow: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: '#666' }}>暂无日志</div>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 执行方法 ─────────────────────────────────────────────────────────────

async function executeAuthMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'login':
      return authService.login({
        email: params.email || DEFAULT_PARAMS.email,
        password: params.password || DEFAULT_PARAMS.password,
      } as LoginRequest);
    case 'register':
      return authService.register({
        email: params.email || DEFAULT_PARAMS.email,
        password: params.password || DEFAULT_PARAMS.password,
        name: params.name || DEFAULT_PARAMS.name,
      } as RegisterRequest);
    case 'logout':
      return authService.logout();
    case 'refreshToken':
      return authService.refreshToken();
    case 'forgotPassword':
      return authService.forgotPassword({ email: params.email || DEFAULT_PARAMS.email });
    case 'resetPassword':
      return authService.resetPassword({
        token: params.token || DEFAULT_PARAMS.token,
        password: params.password || DEFAULT_PARAMS.password,
      });
    case 'isLoggedIn':
      return { loggedIn: authService.isLoggedIn(), token: authService.getToken() };
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executeUserMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'getProfile':
      return userService.getProfile();
    case 'updateProfile':
      return userService.updateProfile({
        name: params.name,
        phone: params.phone,
      } as UpdateProfileRequest);
    case 'changePassword':
      return userService.changePassword({
        currentPassword: params.currentPassword || DEFAULT_PARAMS.currentPassword,
        password: params.password || DEFAULT_PARAMS.newPassword,
        passwordConfirmation: params.passwordConfirmation || DEFAULT_PARAMS.passwordConfirmation,
      });
    case 'getSims':
      return userService.getSims({
        status: params.status as 'ACTIVE' | 'EXPIRED' | 'PENDING',
        page: params.page ? parseInt(params.page) : undefined,
        size: params.size ? parseInt(params.size) : undefined,
      });
    case 'bindSim':
      return userService.bindSim({
        iccid: params.iccid || DEFAULT_PARAMS.iccid,
        activationCode: params.activationCode,
      } as BindSimRequest);
    case 'unbindSim':
      return userService.unbindSim({ iccid: params.iccid || DEFAULT_PARAMS.iccid });
    case 'getAddresses':
      return userService.getAddresses();
    case 'createAddress':
      return userService.createAddress({
        recipientName: params.recipientName || DEFAULT_PARAMS.recipientName,
        phone: params.phone || DEFAULT_PARAMS.phone,
        addressLine1: params.addressLine1 || DEFAULT_PARAMS.addressLine1,
        city: params.city || DEFAULT_PARAMS.city,
        postalCode: params.postalCode || DEFAULT_PARAMS.postalCode,
        country: params.country || DEFAULT_PARAMS.country,
      } as CreateAddressRequest);
    case 'updateAddress':
      return userService.updateAddress(params.addressId || DEFAULT_PARAMS.addressId, {
        recipientName: params.recipientName,
        phone: params.phone,
        addressLine1: params.addressLine1,
        city: params.city,
        postalCode: params.postalCode,
        country: params.country,
      });
    case 'deleteAddress':
      return userService.deleteAddress(params.addressId || DEFAULT_PARAMS.addressId);
    case 'setDefaultAddress':
      return userService.setDefaultAddress(params.addressId || DEFAULT_PARAMS.addressId);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executePackageMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'getPackages':
      return packageService.getPackages({
        locationCode: params.locationCode,
        type: params.type as 'BASE' | 'TOPUP',
        page: params.page ? parseInt(params.page) : undefined,
        size: params.size ? parseInt(params.size) : undefined,
      });
    case 'getHotPackages':
      return packageService.getHotPackages(params.limit ? parseInt(params.limit) : undefined);
    case 'getRechargePackages':
      return packageService.getRechargePackages(params.iccid || DEFAULT_PARAMS.iccid);
    case 'getLocations':
      return packageService.getLocations();
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executeOrderMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'createEsimOrder':
      return orderService.createEsimOrder({
        packageCode: params.packageCode || DEFAULT_PARAMS.packageCode,
        email: params.email || DEFAULT_PARAMS.email,
        quantity: params.quantity ? parseInt(params.quantity) : undefined,
      } as CreateEsimOrderRequest);
    case 'createPhysicalOrder':
      return orderService.createPhysicalOrder({
        productId: params.productId || DEFAULT_PARAMS.productId,
        quantity: parseInt(params.quantity || DEFAULT_PARAMS.quantity),
        email: params.email || DEFAULT_PARAMS.email,
        shippingAddress: {
          recipientName: params.recipientName || DEFAULT_PARAMS.recipientName,
          phone: params.phone || DEFAULT_PARAMS.phone,
          addressLine1: params.addressLine1 || DEFAULT_PARAMS.addressLine1,
          city: params.city || DEFAULT_PARAMS.city,
          postalCode: params.postalCode || DEFAULT_PARAMS.postalCode,
          country: params.country || DEFAULT_PARAMS.country,
        },
      } as CreatePhysicalOrderRequest);
    case 'createTopupOrder':
      return orderService.createTopupOrder({
        iccid: params.iccid || DEFAULT_PARAMS.iccid,
        packageCode: params.packageCode || DEFAULT_PARAMS.packageCode,
        amount: parseInt(params.amount || DEFAULT_PARAMS.amount),
      });
    case 'getOrders':
      return orderService.getOrders({
        status: params.status as OrderStatus | undefined,
        type: params.type as 'ESIM' | 'PHYSICAL',
        page: params.page ? parseInt(params.page) : undefined,
        size: params.size ? parseInt(params.size) : undefined,
      });
    case 'getOrderDetail':
      return orderService.getOrderDetail(params.orderNo || DEFAULT_PARAMS.orderNo);
    case 'cancelOrder':
      return orderService.cancelOrder(params.orderNo || DEFAULT_PARAMS.orderNo, {
        reason: params.reason,
      });
    case 'requestRefund':
      return orderService.requestRefund(params.orderNo || DEFAULT_PARAMS.orderNo, {
        reason: params.reason || DEFAULT_PARAMS.reason,
        amount: params.amount ? parseInt(params.amount) : undefined,
      });
    case 'getTracking':
      return orderService.getTracking(params.orderNo || DEFAULT_PARAMS.orderNo);
    case 'pollOrderStatus':
      return orderService.pollOrderStatus(params.orderNo || DEFAULT_PARAMS.orderNo, {
        interval: params.page ? parseInt(params.page) : 3000,
        maxAttempts: params.size ? parseInt(params.size) : 5,
      });
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executeEsimMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'getDetail':
      return esimService.getDetail(params.iccid || DEFAULT_PARAMS.iccid);
    case 'getUsage':
      return esimService.getUsage(params.iccid || DEFAULT_PARAMS.iccid, {
        daily: params.daily === 'true',
        page: params.page ? parseInt(params.page) : undefined,
        size: params.size ? parseInt(params.size) : undefined,
      });
    case 'topup':
      return esimService.topup({
        iccid: params.iccid || DEFAULT_PARAMS.iccid,
        packageCode: params.packageCode || DEFAULT_PARAMS.packageCode,
        amount: parseInt(params.amount || DEFAULT_PARAMS.amount),
      });
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

async function executePaymentMethod(method: string, params: Record<string, string>): Promise<unknown> {
  switch (method) {
    case 'createPayment':
      return paymentService.createPayment({
        orderNo: params.orderNo || DEFAULT_PARAMS.orderNo,
        method: params.method as 'STRIPE' | 'PAYPAL',
        successUrl: params.successUrl || DEFAULT_PARAMS.successUrl,
        cancelUrl: params.cancelUrl || DEFAULT_PARAMS.cancelUrl,
      } as CreatePaymentRequest);
    case 'getPaymentStatus':
      return paymentService.getPaymentStatus(params.paymentId || DEFAULT_PARAMS.paymentId);
    case 'validateCoupon':
      return paymentService.validateCoupon({
        code: params.code || DEFAULT_PARAMS.code,
        orderNo: params.orderNo || DEFAULT_PARAMS.orderNo,
      } as ValidateCouponRequest);
    case 'getCoupons':
      return paymentService.getCoupons();
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}