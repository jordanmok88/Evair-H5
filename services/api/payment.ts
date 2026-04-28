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
  CREATE_PAYMENT: '/app/payments/create',
  PAYMENT_BY_ID: (paymentId: string) => `/app/payments/${paymentId}`,
  VALIDATE_COUPON: '/app/coupons/validate',
  COUPONS: '/app/coupons',
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
   * 创建支付会话 (Stripe PaymentIntent)
   * @param data 支付信息（orderNo + method）
   * @returns PaymentIntent details (clientSecret, amount, etc.)
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

};

export default paymentService;