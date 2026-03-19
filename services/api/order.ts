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

export default orderService;