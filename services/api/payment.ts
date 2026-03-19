/**
 * 支付服务模块
 * 处理支付创建、查询、优惠券验证等
 */

import { get, post } from './client';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentDto,
  ValidateCouponRequest,
  ValidateCouponResponse,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  CREATE_PAYMENT: '/payments/create',
  PAYMENT_BY_ID: (paymentId: string) => `/payments/${paymentId}`,
  VALIDATE_COUPON: '/coupons/validate',
} as const;

// ─── 支付服务 ────────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * 创建支付会话
   * @param data 支付信息
   * @returns 支付 URL 和过期时间
   */
  async createPayment(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return post<CreatePaymentResponse>(ENDPOINTS.CREATE_PAYMENT, data);
  },

  /**
   * 查询支付状态
   * @param paymentId 支付 ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentDto> {
    return get<PaymentDto>(ENDPOINTS.PAYMENT_BY_ID(paymentId));
  },

  /**
   * 验证优惠券
   * @param data 优惠券代码和订单号
   */
  async validateCoupon(data: ValidateCouponRequest): Promise<ValidateCouponResponse> {
    return post<ValidateCouponResponse>(ENDPOINTS.VALIDATE_COUPON, data);
  },

  // ============ 辅助方法 ============

  /**
   * 格式化金额显示
   * @param cents 金额（分）
   * @param currency 货币代码
   */
  formatAmount(cents: number, currency: string = 'USD'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  /**
   * 跳转到支付页面
   * @param paymentUrl 支付 URL
   */
  redirectToPayment(paymentUrl: string): void {
    window.location.href = paymentUrl;
  },

  /**
   * 计算折扣金额
   * @param orderAmount 订单金额（分）
   * @param coupon 优惠券信息
   */
  calculateDiscount(
    orderAmount: number,
    coupon: ValidateCouponResponse
  ): number {
    if (!coupon.valid) return 0;

    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round((orderAmount * (coupon.discountValue ?? 0)) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue ?? 0;
    }

    return discount;
  },

  /**
   * 计算最终支付金额
   * @param orderAmount 订单金额（分）
   * @param discount 折扣金额（分）
   */
  calculateFinalAmount(orderAmount: number, discount: number): number {
    return Math.max(0, orderAmount - discount);
  },
};

export default paymentService;