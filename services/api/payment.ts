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
  CouponDto,
} from './types';

// ─── API 端点 ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  CREATE_PAYMENT: '/h5/payments/create',
  PAYMENT_BY_ID: (paymentId: string) => `/h5/payments/${paymentId}`,
  VALIDATE_COUPON: '/h5/coupons/validate',
  COUPONS: '/h5/coupons',
  // Activation Funnel: card-on-file collection (no charge).
  // Lives on the `/app` tier — cookie/JWT scoped to the AppUser.
  SETUP_INTENT: '/app/payments/setup-intent',
} as const;

// ─── SetupIntent ─────────────────────────────────────────────────────────

/**
 * Response from `POST /v1/app/payments/setup-intent`.
 *
 * `publishableKey` is echoed by the backend so the H5 boots Stripe.js
 * with the same env (test/live) the Laravel side is configured for.
 * It can be `null` in pristine local dev — callers should fall back to
 * `VITE_STRIPE_PUBLISHABLE_KEY` in that case.
 */
export interface SetupIntentSession {
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
  publishableKey: string | null;
}

export interface CreateSetupIntentRequest {
  /** Optional ICCID — surfaces on the Stripe dashboard SetupIntent
   *  metadata so support can correlate cards back to a SIM. */
  iccid?: string;
}

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

  /**
   * 获取用户可用优惠券列表
   */
  async getCoupons(): Promise<{ coupons: CouponDto[] }> {
    return get<{ coupons: CouponDto[] }>(ENDPOINTS.COUPONS);
  },

  /**
   * Mint a Stripe SetupIntent for the current AppUser.
   *
   * Used by the Activation Funnel `/activate` page (and later by the
   * /app/my-sims auto-renew enable flow) to collect a card via the
   * Payment Element without charging anything. The resulting `pm_…`
   * is then forwarded to `bind-sim` so `RenewExpiringSims` can charge
   * it off-session when the bundled period is about to lapse.
   *
   * Auth required — server returns 401 otherwise.
   */
  async createSetupIntent(payload: CreateSetupIntentRequest = {}): Promise<SetupIntentSession> {
    return post<SetupIntentSession>(ENDPOINTS.SETUP_INTENT, payload);
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