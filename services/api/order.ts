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
  CreateOrderResponse,
  OrderListParams,
  LaravelPaginatedData,
  CancelOrderRequest,
  CancelOrderResponse,
  RefundRequest,
  RefundResponse,
  TrackingResponse,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────
//
// Migrated from /h5/orders/* to /app/orders/* (App tier).
// Key differences:
//   - Detail/get endpoint uses numeric `id` instead of `orderNo`.
//   - Order list returns Laravel pagination: { data: T[], meta: {...} }.
//   - Status values are lowercase (pending, paid, cancelled, etc.).
//   - Amount is float in dollars (not integer cents).
//   - orderNumber instead of orderNo in responses.
//   - Create returns OrderDetailResource (code "201").
//   - Cancel returns { data: null } (code "200").

const ENDPOINTS = {
  /** POST /app/orders — create eSIM order (returns OrderDetailResource) */
  CREATE_ORDER: '/app/orders',
  /** GET /app/orders — list orders (Laravel paginated) */
  ORDERS: '/app/orders',
  /** GET /app/orders/{id} — order detail (uses numeric id) */
  ORDER_BY_ID: (id: number | string) => `/app/orders/${id}`,
  /** POST /app/orders/{id}/cancel — cancel order */
  CANCEL_ORDER: (id: number | string) => `/app/orders/${id}/cancel`,
  /** POST /app/orders/track/{orderNo} — tracking (kept on orderNo, not id) */
  TRACKING: (orderNo: string) => `/app/orders/track/${orderNo}`,
  /**
   * Refund is NOT available in the App tier.
   * Kept on legacy /h5/ endpoint until App tier adds it.
   */
  REFUND_ORDER: (orderNo: string) => `/h5/orders/${orderNo}/refund`,
} as const;

// ─── 订单服务 ────────────────────────────────────────────────────────────

export const orderService = {
  // ============ 订单创建 ============

  /**
   * 创建 eSIM 订单
   * POST /app/orders → returns OrderDetailResource (code "201")
   * @param data 订单信息
   */
  async createEsimOrder(data: CreateEsimOrderRequest): Promise<CreateOrderResponse> {
    return post<CreateOrderResponse>(ENDPOINTS.CREATE_ORDER, data);
  },

  /**
   * 创建实体 SIM 订单
   * POST /app/orders → returns OrderDetailResource (code "201")
   * @param data 订单信息（含收货地址）
   */
  async createPhysicalOrder(data: CreatePhysicalOrderRequest): Promise<CreateOrderResponse> {
    return post<CreateOrderResponse>(ENDPOINTS.CREATE_ORDER, data);
  },

  // ============ 订单查询 ============

  /**
   * 获取订单列表
   * GET /app/orders → returns Laravel-paginated OrderListResource
   * Response shape: { data: OrderDto[], meta: { currentPage, lastPage, perPage, total } }
   * @param params 筛选参数
   */
  async getOrders(params?: OrderListParams): Promise<LaravelPaginatedData<OrderDto>> {
    return get<LaravelPaginatedData<OrderDto>>(ENDPOINTS.ORDERS, params as Record<string, unknown>);
  },

  /**
   * 获取订单详情
   * GET /app/orders/{id} — uses numeric order id, not orderNumber
   * @param id 订单 ID (numeric, from OrderDetailDto.id)
   */
  async getOrderDetail(id: number | string): Promise<OrderDetailDto> {
    return get<OrderDetailDto>(ENDPOINTS.ORDER_BY_ID(id));
  },

  // ============ 订单操作 ============

  /**
   * 取消订单
   * POST /app/orders/{id}/cancel → returns { data: null } (code "200")
   * @param id 订单 ID (numeric)
   * @param data 取消原因
   */
  async cancelOrder(id: number | string, data?: CancelOrderRequest): Promise<CancelOrderResponse> {
    return post<CancelOrderResponse>(ENDPOINTS.CANCEL_ORDER(id), data);
  },

  /**
   * 申请退款
   * NOTE: No App-tier equivalent exists yet. Stays on legacy /h5/ endpoint.
   * @param orderNo 订单号
   * @param data 退款原因和金额
   */
  async requestRefund(orderNo: string, data: RefundRequest): Promise<RefundResponse> {
    return post<RefundResponse>(ENDPOINTS.REFUND_ORDER(orderNo), data);
  },

  // ============ 物流追踪 ============

  /**
   * 获取物流信息
   * GET /app/orders/track/{orderNo}
   * @param orderNo 订单号 (note: tracking still uses orderNumber, not id)
   */
  async getTracking(orderNo: string): Promise<TrackingResponse> {
    return get<TrackingResponse>(ENDPOINTS.TRACKING(orderNo));
  },

  // ============ 辅助方法 ============

  /**
   * 轮询订单状态直到完成或超时
   * @param id 订单 ID (numeric, from OrderDetailDto.id)
   * @param options 轮询选项
   */
  async pollOrderStatus(
    id: number | string,
    options?: {
      interval?: number;
      maxAttempts?: number;
      onProgress?: (order: OrderDetailDto) => void;
    }
  ): Promise<OrderDetailDto> {
    const interval = options?.interval ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const order = await this.getOrderDetail(id);

      options?.onProgress?.(order);

      // 订单已支付/完成，返回结果 (App tier uses lowercase status values)
      if (order.status === 'paid' || order.status === 'completed') {
        return order;
      }

      // 订单已取消，抛出错误
      if (order.status === 'cancelled') {
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
  id: number | string,
  options: PollEsimOrderOptions = {}
): Promise<OrderDetailDto> {
  const intervalMs = options.intervalMs ?? 3000;
  const maxAttempts = options.maxAttempts ?? 40;
  const isCancelled = options.isCancelled ?? (() => false);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (isCancelled()) throw new PollCancelledError();

    const order = await orderService.getOrderDetail(id);
    options.onProgress?.(order);

    // 履约失败/取消/退款 —— 终止 (App tier uses lowercase status values)
    if (order.status === 'cancelled') throw new Error('Order was cancelled');
    if (order.status === 'refunded') throw new Error('Order was refunded');

    // OrderDetailResource 只在 SimAsset 落库后才暴露 esim 块，
    // 命中即视为履约成功
    if (order.esim) return order;

    // status=completed 但没 esim 是后端 bug，明确报错而非静默返回
    if (order.status === 'completed') {
      throw new Error('Order completed but eSIM details are missing — please contact support.');
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error('Polling timeout — your eSIM is still being prepared. Check My SIMs in a moment.');
}

export default orderService;