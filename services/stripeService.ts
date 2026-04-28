/**
 * Stripe 支付服务
 * 处理充值支付流程中的 Stripe.js 集成
 */

import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { esimService } from './api/esim';

// 单例 Stripe 实例
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * 获取 Stripe 实例（单例）
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('VITE_STRIPE_PUBLISHABLE_KEY is not set');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
}

/**
 * 完整充值支付流程
 * @param params 充值参数
 * @returns 支付结果
 */
export async function processRechargePayment(params: {
  iccid: string;
  packageCode: string;
  supplierType: 'esimaccess' | 'pccw';
  cardElement: StripeCardElement;
  onStatusChange?: (status: 'creating_order' | 'creating_session' | 'processing_payment' | 'completed' | 'failed', message?: string) => void;
}): Promise<{
  success: boolean;
  rechargeId?: number;
  error?: string;
}> {
  const { iccid, packageCode, supplierType, cardElement, onStatusChange } = params;

  try {
    // Step 1: 创建充值订单
    onStatusChange?.('creating_order', 'Creating order...');
    const topupResponse = await esimService.topup({
      iccid,
      packageCode,
      supplierType,
    });

    const rechargeId = topupResponse.id;

    // Step 2: 创建支付会话
    onStatusChange?.('creating_session', 'Creating payment session...');
    const paymentSession = await esimService.createRechargePayment(rechargeId);

    // Step 3: 使用 Stripe.js 确认支付
    onStatusChange?.('processing_payment', 'Processing payment...');
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe is not initialized');
    }

    // 调用 Stripe.js 确认支付
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      paymentSession.clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (stripeError) {
      throw new Error(stripeError.message || 'Payment failed');
    }

    if (paymentIntent?.status !== 'succeeded') {
      throw new Error('Payment was not completed');
    }

    // Step 4: 轮询充值状态直到完成
    onStatusChange?.('completed');
    return {
      success: true,
      rechargeId,
    };
  } catch (err) {
    console.error('Recharge payment failed:', err);
    onStatusChange?.('failed', err instanceof Error ? err.message : 'Unknown error');
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * 轮询充值状态
 * @param rechargeId 充值记录 ID
 * @param maxAttempts 最大轮询次数
 * @param intervalMs 轮询间隔（毫秒）
 */
export async function pollRechargeStatus(
  rechargeId: number,
  maxAttempts: number = 10,
  intervalMs: number = 1000
): Promise<{
  success: boolean;
  status?: 'Completed' | 'Failed' | 'Processing';
  error?: string;
}> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const detail = await esimService.getRechargeDetail(rechargeId);

      if (detail.orderStatus === 'Completed') {
        return { success: true, status: 'Completed' };
      }

      if (detail.orderStatus === 'Failed') {
        return {
          success: false,
          status: 'Failed',
          error: detail.failureReason || 'Recharge failed',
        };
      }

      // 如果还没完成，等待后继续轮询
      if (attempt < maxAttempts) {
        // 指数退避：1s → 2s → 4s
        const delay = Math.min(intervalMs * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      console.error(`Poll attempt ${attempt} failed:`, err);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  // 超时但仍在处理中
  return {
    success: false,
    status: 'Processing',
    error: 'Polling timeout, recharge is still processing',
  };
}
