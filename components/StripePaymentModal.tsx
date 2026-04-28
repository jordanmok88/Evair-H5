/**
 * Stripe 支付弹窗组件
 * 可在任意需要支付场景中复用的通用组件
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Loader2, CreditCard } from 'lucide-react';
import { getStripe, pollRechargeStatus } from '../services/stripeService';
import { esimService } from '../services/api/esim';
import type { Stripe, StripeCardElement } from '@stripe/stripe-js';

export interface PaymentItem {
  /** 商品/套餐名称 */
  label: string;
  /** 金额 */
  amount: number;
  /** 数量（可选） */
  quantity?: number;
}

export interface RechargePaymentConfig {
  /** ICCID */
  iccid: string;
  /** 套餐代码 */
  packageCode: string;
  /** 金额 */
  amount: number;
  /** 供应商类型 */
  supplierType: 'esimaccess' | 'pccw';
}

export interface StripePaymentModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 支付金额（美元） */
  amount: number;
  /** 货币类型（默认 USD） */
  currency?: string;
  /** 支付描述/商品列表 */
  items?: PaymentItem[];
  /** Stripe clientSecret（如果不传且有 rechargeConfig，会自动创建） */
  clientSecret?: string | null;
  /** 充值配置（如果有，会自动创建充值订单和支付会话） */
  rechargeConfig?: RechargePaymentConfig;
  /** 充值记录 ID */
  rechargeId?: number | null;
  /** 加载状态（是否正在获取 clientSecret） */
  isLoadingClientSecret?: boolean;
  /** 加载错误信息 */
  loadingError?: string | null;
  /** 支付成功回调（仅在轮询成功后触发） */
  onSuccess?: (rechargeId?: number) => void;
  /** 支付失败回调 */
  onError?: (error: string) => void;
  /** 流程完成回调（无论成功失败都会触发，用于关闭父级弹窗） */
  onComplete?: (success: boolean, rechargeId?: number) => void;
  /** 返回上一页回调（错误状态时可用） */
  onBack?: () => void;
  /** 自定义标题 */
  title?: string;
  /** 成功消息 */
  successMessage?: string;
  /** 失败消息 */
  errorMessage?: string;
  /** 准备支付中消息 */
  preparingMessage?: string;
  /** 支付中消息 */
  processingMessage?: string;
}

/** 支付状态 */
type PaymentStatus = 'idle' | 'creating_order' | 'creating_session' | 'ready' | 'processing' | 'success' | 'error';

/**
 * Stripe 支付弹窗组件
 *
 * @example
 * ```tsx
 * // 简单支付（已有 clientSecret）
 * <StripePaymentModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   amount={9.99}
 *   clientSecret={clientSecret}
 *   onSuccess={() => console.log('Paid!')}
 * />
 *
 * // 充值支付（自动创建订单）
 * <StripePaymentModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   amount={9.99}
 *   rechargeConfig={{ iccid, packageCode, amount }}
 *   onComplete={(success) => success && setRechargeModalOpen(false)}
 * />
 * ```
 */
const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  currency = 'USD',
  items,
  clientSecret: externalClientSecret,
  rechargeConfig,
  rechargeId: externalRechargeId,
  isLoadingClientSecret: externalLoading = false,
  loadingError: externalError,
  onSuccess,
  onError,
  onComplete,
  onBack,
  title,
  successMessage = 'Payment Successful!',
  errorMessage = 'Payment Failed',
  preparingMessage = 'Preparing payment...',
  processingMessage = 'Processing...',
}) => {
  const [internalStatus, setInternalStatus] = useState<PaymentStatus>('idle');
  const [internalClientSecret, setInternalClientSecret] = useState<string | null>(null);
  const [internalRechargeId, setInternalRechargeId] = useState<number | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [paymentStatus2, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [cardError, setCardError] = useState<string | null>(null);

  const cardElementRef = useRef<HTMLDivElement>(null);
  const stripeInstanceRef = useRef<Stripe | null>(null);
  const cardElementRef2 = useRef<StripeCardElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 优先使用外部传入的值，否则使用内部状态
  const effectiveClientSecret = externalClientSecret ?? internalClientSecret;
  const effectiveRechargeId = externalRechargeId ?? internalRechargeId;
  const effectiveLoading = externalLoading || internalStatus === 'creating_order' || internalStatus === 'creating_session';
  const effectiveError = externalError ?? internalError;

  // 是否处于可交互状态
  const isReady = internalStatus === 'ready' && !!effectiveClientSecret;
  const isProcessing = paymentStatus2 === 'processing' || internalStatus === 'creating_order' || internalStatus === 'creating_session';

  // 自动创建充值订单和支付会话
  useEffect(() => {
    if (!isOpen || !rechargeConfig) return;
    // 如果已经有 clientSecret 或正在创建中，跳过
    if (effectiveClientSecret || internalStatus === 'creating_order' || internalStatus === 'creating_session') return;

    let cancelled = false;

    const createOrderAndSession = async () => {
      try {
        // Step 1: 创建充值订单
        setInternalStatus('creating_order');
        setInternalError(null);

        const topupResponse = await esimService.topup({
          iccid: rechargeConfig.iccid,
          packageCode: rechargeConfig.packageCode,
          supplierType: rechargeConfig.supplierType,
        });

        if (cancelled) return;

        // Step 2: 创建支付会话
        setInternalStatus('creating_session');
        const session = await esimService.createRechargePayment(topupResponse.id);

        if (cancelled) return;

        // 成功：更新状态
        setInternalClientSecret(session.clientSecret);
        setInternalRechargeId(topupResponse.id);
        setInternalStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setInternalError(err.message || 'Failed to create order');
        setInternalStatus('error');
        onError?.(err.message || 'Failed to create order');
      }
    };

    createOrderAndSession();

    return () => {
      cancelled = true;
    };
  }, [isOpen, rechargeConfig, effectiveClientSecret, onError]);

  // 初始化 Stripe Card Element
  useEffect(() => {
    if (!isOpen || !isReady || !cardElementRef.current) return;

    let mounted = true;

    const initStripe = async () => {
      const stripe = await getStripe();
      if (!stripe || !mounted || !cardElementRef.current) return;

      stripeInstanceRef.current = stripe;

      // 销毁已存在的 Card Element
      if (cardElementRef2.current) {
        cardElementRef2.current.unmount();
        cardElementRef2.current = null;
      }

      const elements = stripe.elements();
      const cardElement = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
          },
        },
      });

      cardElement.mount(cardElementRef.current);
      cardElementRef2.current = cardElement;

      cardElement.on('change', (event) => {
        setCardError(event.error?.message ?? null);
      });
    };

    initStripe();

    return () => {
      mounted = false;
      if (cardElementRef2.current) {
        cardElementRef2.current.unmount();
        cardElementRef2.current = null;
      }
    };
  }, [isOpen, isReady]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setInternalStatus('idle');
      setInternalClientSecret(null);
      setInternalRechargeId(null);
      setInternalError(null);
      setPaymentStatus('idle');
      setCardError(null);
    }
  }, [isOpen]);

  // 键盘事件处理（ESC 关闭）
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  // 处理支付
  const handlePayment = useCallback(async () => {
    if (!stripeInstanceRef.current || !cardElementRef2.current || !effectiveClientSecret) return;

    setPaymentStatus('processing');
    setCardError(null);

    try {
      const { error, paymentIntent } = await stripeInstanceRef.current.confirmCardPayment(
        effectiveClientSecret,
        {
          payment_method: {
            card: cardElementRef2.current,
          },
        }
      );

      if (error) {
        setCardError(error.message || 'Payment failed');
        setPaymentStatus('error');
        onError?.(error.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // 如果有 rechargeId，轮询充值状态直到完成
        if (effectiveRechargeId) {
          setInternalStatus('processing');
          const pollResult = await pollRechargeStatus(effectiveRechargeId, 30, 2000);
          if (pollResult.success) {
            setPaymentStatus('success');
            onSuccess?.(effectiveRechargeId);
            onComplete?.(true, effectiveRechargeId);
          } else {
            const msg = pollResult.error || 'Recharge is still processing';
            setCardError(msg);
            setPaymentStatus('error');
            onError?.(msg);
            onComplete?.(false, effectiveRechargeId);
          }
        } else {
          setPaymentStatus('success');
          onSuccess?.();
          onComplete?.(true);
        }
      } else {
        setCardError('Payment was not completed');
        setPaymentStatus('error');
        onError?.('Payment was not completed');
        onComplete?.(false);
      }
    } catch (err: any) {
      setCardError(err.message || 'Payment failed');
      setPaymentStatus('error');
      onError?.(err.message || 'Payment failed');
      onComplete?.(false);
    }
  }, [effectiveClientSecret, effectiveRechargeId, onSuccess, onError, onComplete]);

  // 重试支付
  const handleRetry = useCallback(() => {
    setPaymentStatus('idle');
    setCardError(null);
  }, []);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  if (!isOpen) return null;

  const displayAmount = items?.length ? items.reduce((sum, item) => sum + item.amount * (item.quantity || 1), 0) : amount;
  const displayCurrency = currency.toUpperCase();

  // 计算当前显示的状态
  const currentStatus = paymentStatus2 === 'success' ? 'success' : paymentStatus2 === 'error' ? 'error' : effectiveLoading ? 'loading' : 'ready';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-payment-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        touchAction: 'none',
      }}
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          maxHeight: '90vh',
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: '24px 20px',
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 id="stripe-payment-title" style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {title || (currentStatus === 'success' ? successMessage : internalStatus === 'processing' ? 'Processing...' : 'Complete Payment')}
          </h3>
          {!isProcessing && (
            <button
              onClick={handleClose}
              aria-label="Close payment dialog"
              style={{ background: '#f1f5f9', borderRadius: '50%', padding: 6, border: 'none', cursor: 'pointer' }}
            >
              <X size={18} color="#64748b" />
            </button>
          )}
        </div>

        {/* Success State */}
        {currentStatus === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle2 size={32} color="#22c55e" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              {successMessage}
            </h4>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
              Your payment has been processed successfully.
            </p>
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 14,
                backgroundColor: '#FF6600',
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : currentStatus === 'error' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
              {errorMessage}
            </h4>
            <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 20 }}>
              {cardError || internalError || 'An error occurred during payment'}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {onBack && (
                <button
                  onClick={onBack}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 14,
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={handleRetry}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 14,
                  backgroundColor: '#FF6600',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Order Summary */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}>
              {items && items.length > 0 ? (
                <>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: index < items.length - 1 ? 8 : 0 }}>
                      <span style={{ fontSize: 14, color: '#64748b' }}>
                        {item.label}
                        {item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                        {displayCurrency === 'USD' ? '$' : displayCurrency}{item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#FF6600' }}>
                      {displayCurrency === 'USD' ? '$' : displayCurrency}{displayAmount.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>Amount</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FF6600' }}>
                    {displayCurrency === 'USD' ? '$' : displayCurrency}{displayAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Loading State */}
            {!isReady ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                {effectiveError ? (
                  <>
                    <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 16 }}>
                      {effectiveError}
                    </p>
                    <button
                      onClick={handleClose}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        borderRadius: 14,
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#FF6600' }} />
                    <p style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>
                      {internalStatus === 'creating_order' ? 'Creating order...' :
                       internalStatus === 'creating_session' ? 'Creating payment session...' :
                       internalStatus === 'processing' ? 'Processing recharge...' :
                       preparingMessage}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Card Element Container */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                    <CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Card Details
                  </label>
                  <div
                    ref={cardElementRef}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 14,
                      backgroundColor: '#fff',
                      minHeight: 44,
                    }}
                  />
                  {cardError && (
                    <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>
                      {cardError}
                    </p>
                  )}

                  {import.meta.env.DEV && (
                    <div style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#166534',
                    }}>
                      <strong>测试卡号：</strong>4242 4242 4242 4242<br/>
                      有效期：12/30 | CVC：123 | 邮编：10001
                    </div>
                  )}
                </div>

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={paymentStatus2 === 'processing'}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 14,
                    backgroundColor: paymentStatus2 === 'processing' ? '#f97316' : '#FF6600',
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: paymentStatus2 === 'processing' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {paymentStatus2 === 'processing' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {processingMessage}
                    </>
                  ) : (
                    <>Pay {displayCurrency === 'USD' ? '$' : displayCurrency}{displayAmount.toFixed(2)}</>
                  )}
                </button>

                {/* Stripe Branding */}
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                  Secured by Stripe
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StripePaymentModal;
