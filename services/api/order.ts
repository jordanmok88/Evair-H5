/**
 * 订单服务模块
 * 处理订单创建、查询、取消、退款、物流追踪等
 */

import { get, post } from './client';
import type {
  OrderDto,
  OrderDetailDto,
  CreateEsimOrderRequest,
  CreatePhysicalOrderRequest,
  CreateTopupOrderRequest,
  CreateTopupOrderResponse,
  CreateOrderResponse,
  OrderListParams,
  PaginatedData,
  CancelOrderRequest,
  CancelOrderResponse,
  RefundRequest,
  RefundResponse,
  TrackingResponse,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  ORDERS: '/h5/orders',
  ORDER_BY_NO: (orderNo: string) => `/h5/orders/${orderNo}`,
  ESIM_ORDER: '/h5/orders/esim',
  PHYSICAL_ORDER: '/h5/orders/physical',
  TOPUP_ORDER: '/h5/orders/topup',
  CANCEL_ORDER: (orderNo: string) => `/h5/orders/${orderNo}/cancel`,
  REFUND_ORDER: (orderNo: string) => `/h5/orders/${orderNo}/refund`,
  TRACKING: (orderNo: string) => `/h5/orders/${orderNo}/tracking`,
} as const;

// ─── 订单服务 ────────────────────────────────────────────────────────────

export const orderService = {
  // ============ 订单创建 ============

  /**
   * 创建 eSIM 订单
   * @param data 订单信息
   */
  async createEsimOrder(data: CreateEsimOrderRequest): Promise<CreateOrderResponse> {
    return post<CreateOrderResponse>(ENDPOINTS.ESIM_ORDER, data);
  },

  /**
   * 创建实体 SIM 订单
   * @param data 订单信息（含收货地址）
   */
  async createPhysicalOrder(data: CreatePhysicalOrderRequest): Promise<CreateOrderResponse> {
    return post<CreateOrderResponse>(ENDPOINTS.PHYSICAL_ORDER, data);
  },

  /**
   * 创建充值订单
   * @param data 充值信息
   */
  async createTopupOrder(data: CreateTopupOrderRequest): Promise<CreateTopupOrderResponse> {
    return post<CreateTopupOrderResponse>(ENDPOINTS.TOPUP_ORDER, data);
  },

  // ============ 订单查询 ============

  /**
   * 获取订单列表
   * @param params 筛选参数
   */
  async getOrders(params?: OrderListParams): Promise<PaginatedData<OrderDto>> {
    return get<PaginatedData<OrderDto>>(ENDPOINTS.ORDERS, params as Record<string, unknown>);
  },

  /**
   * 获取订单详情
   * @param orderNo 订单号
   */
  async getOrderDetail(orderNo: string): Promise<OrderDetailDto> {
    return get<OrderDetailDto>(ENDPOINTS.ORDER_BY_NO(orderNo));
  },

  // ============ 订单操作 ============

  /**
   * 取消订单
   * @param orderNo 订单号
   * @param data 取消原因
   */
  async cancelOrder(orderNo: string, data?: CancelOrderRequest): Promise<CancelOrderResponse> {
    return post<CancelOrderResponse>(ENDPOINTS.CANCEL_ORDER(orderNo), data);
  },

  /**
   * 申请退款
   * @param orderNo 订单号
   * @param data 退款原因和金额
   */
  async requestRefund(orderNo: string, data: RefundRequest): Promise<RefundResponse> {
    return post<RefundResponse>(ENDPOINTS.REFUND_ORDER(orderNo), data);
  },

  // ============ 物流追踪 ============

  /**
   * 获取物流信息
   * @param orderNo 订单号
   */
  async getTracking(orderNo: string): Promise<TrackingResponse> {
    return get<TrackingResponse>(ENDPOINTS.TRACKING(orderNo));
  },

  // ============ 辅助方法 ============

  /**
   * 轮询订单状态直到完成或超时
   * @param orderNo 订单号
   * @param options 轮询选项
   */
  async pollOrderStatus(
    orderNo: string,
    options?: {
      interval?: number;
      maxAttempts?: number;
      onProgress?: (order: OrderDetailDto) => void;
    }
  ): Promise<OrderDetailDto> {
    const interval = options?.interval ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const order = await this.getOrderDetail(orderNo);

      options?.onProgress?.(order);

      // 订单已支付/完成，返回结果
      if (order.status === 'PAID' || order.status === 'COMPLETED') {
        return order;
      }

      // 订单已取消，抛出错误
      if (order.status === 'CANCELLED') {
        throw new Error('Order was cancelled');
      }

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Polling timeout');
  },
};

// ─── eSIM 履约专用轮询 ───────────────────────────────────────────────
//
// 与 orderService.pollOrderStatus 的区别：
//   - pollOrderStatus 在 status='paid' 就返回 —— 但此刻
//     OrderProvisioningService 可能还在调供应商 API，esim 字段尚未落库；
//   - pollEsimOrderUntilProvisioned 等到 esim 字段出现（履约结束）才返回，
//     更适合"用户付完款留在页面，等着拿 QR"的 UX；
//   - 多了 isCancelled 钩子，方便 React 组件卸载时及时退出。

export interface PollEsimOrderOptions {
  /** 单次轮询间隔，默认 3s */
  intervalMs?: number;
  /** 最大轮询次数，默认 40 (= 2 分钟) */
  maxAttempts?: number;
  /** 调用方退出钩子，每次循环检查；返回 true 立即抛 PollCancelledError */
  isCancelled?: () => boolean;
  /** 每次拿到订单详情时回调，便于 UI 显示进度 */
  onProgress?: (order: OrderDetailDto) => void;
}

export class PollCancelledError extends Error {
  constructor() {
    super('Poll cancelled');
    this.name = 'PollCancelledError';
  }
}

export async function pollEsimOrderUntilProvisioned(
  orderNo: string,
  options: PollEsimOrderOptions = {}
): Promise<OrderDetailDto> {
  const intervalMs = options.intervalMs ?? 3000;
  const maxAttempts = options.maxAttempts ?? 40;
  const isCancelled = options.isCancelled ?? (() => false);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (isCancelled()) throw new PollCancelledError();

    const order = await orderService.getOrderDetail(orderNo);
    options.onProgress?.(order);

    // 履约失败/取消/退款 —— 终止
    if (order.status === 'CANCELLED') throw new Error('Order was cancelled');
    if (order.status === 'REFUNDED') throw new Error('Order was refunded');

    // OrderDetailResource 只在 SimAsset 落库后才暴露 esim 块（H5/OrderDetailResource.php），
    // 命中即视为履约成功
    if (order.esim) return order;

    // status=COMPLETED 但没 esim 是后端 bug，明确报错而非静默返回
    if (order.status === 'COMPLETED') {
      throw new Error('Order completed but eSIM details are missing — please contact support.');
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error('Polling timeout — your eSIM is still being prepared. Check My SIMs in a moment.');
}

export default orderService;