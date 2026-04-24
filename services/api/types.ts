/**
 * 后端 API 类型定义
 * 基于 docs/BACKEND_API_SPEC.md
 */

// ─── 通用响应类型 ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

// ─── 错误码枚举 ──────────────────────────────────────────────────────────

export enum ApiErrorCode {
  // 通用错误
  SUCCESS = 0,
  UNKNOWN_ERROR = -1,
  INVALID_REQUEST = -2,
  UNAUTHORIZED = -3,
  FORBIDDEN = -4,
  NOT_FOUND = -5,
  RATE_LIMIT_EXCEEDED = -6,
  SERVICE_UNAVAILABLE = -7,

  // 认证模块 (1000-1999)
  INVALID_CREDENTIALS = 1001,
  ACCOUNT_NOT_FOUND = 1002,
  ACCOUNT_DISABLED = 1003,
  EMAIL_ALREADY_EXISTS = 1011,
  INVALID_EMAIL_FORMAT = 1012,
  PASSWORD_TOO_WEAK = 1013,
  INVALID_REFRESH_TOKEN = 1021,
  TOKEN_EXPIRED = 1022,

  // 用户模块 (2000-2999)
  CURRENT_PASSWORD_INCORRECT = 2011,
  SIM_ALREADY_BOUND = 2021,
  INVALID_ICCID = 2022,
  SIM_NOT_FOUND = 2023,

  // 套餐模块 (3000-3999)
  // 预留

  // 订单模块 (4000-4999)
  ORDER_CANNOT_BE_CANCELLED = 4011,
  ORDER_ALREADY_CANCELLED = 4012,
  ORDER_NOT_REFUNDABLE = 4021,
  REFUND_ALREADY_REQUESTED = 4022,

  // 支付模块 (5000-5999)
  COUPON_EXPIRED = 5011,
  COUPON_NOT_FOUND = 5012,
  COUPON_ALREADY_USED = 5013,
  ORDER_AMOUNT_TOO_LOW = 5014,

  // eSIM 模块 (6000-6999)
  // 预留

  // 第三方服务 (7000-7999)
  // 预留
}

// ─── 认证模块类型 ────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// ─── 用户模块类型 ────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone?: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    dataAlert: boolean;
    expiryAlert: boolean;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export interface UserSimDto {
  id: string;
  iccid: string;
  type: 'ESIM' | 'PHYSICAL';
  packageName: string;
  countryCode: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'INACTIVE';
  totalVolume: number;
  usedVolume: number;
  expiredTime: string;
  activationDate: string | null;
  smdpAddress?: string;
  activationCode?: string;
}

export interface BindSimRequest {
  iccid: string;
  activationCode?: string;
}

export interface UnbindSimRequest {
  iccid: string;
}

// ─── 地址模块类型 ────────────────────────────────────────────────────────

export interface AddressDto {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CreateAddressRequest {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {}

/** POST …/addresses 成功时 data 形态（BACKEND_API_SPEC 2.2.8；后端也可能返回更多字段） */
export interface AddressCreatedResponse {
  id: string;
  recipientName: string;
  isDefault: boolean;
  createdAt: string;
}

/** PUT …/addresses/:id 成功时 data 形态（2.2.9）；设置默认地址复用同一 PUT */
export interface AddressUpdatedResponse {
  id: string;
  updatedAt?: string;
}

/** DELETE …/addresses/:id 成功时 data 形态（2.2.10） */
export interface AddressDeletedResponse {
  success: boolean;
}

// ─── 套餐模块类型 ────────────────────────────────────────────────────────

export interface PackageDto {
  packageCode: string;
  /** Red Tea packageCode for provisioning; never shown to users. */
  supplier_package_code?: string;
  name: string;
  price: number;
  currency: string;
  volume: number;
  duration: number;
  durationUnit: 'DAY' | 'MONTH';
  /**
   * Primary ISO-2 country code (kept for back-compat with single-country
   * renderers). For a multi-country plan this is just the first entry of
   * {@link locations}; prefer `locations` / `is_multi_country` when you need
   * to decide the "single vs multi-country" UX.
   */
  location: string;
  locationName: string;
  /**
   * Full ISO-2 list this plan covers. Single-country plans have length 1,
   * regional plans may have 2+ (e.g. ["US","CA","MX"] for North America),
   * global plans carry 100+ codes. Added to backend payload together with
   * `is_multi_country` so clients can correctly group/filter.
   */
  locations?: string[];
  is_multi_country?: boolean;
  type: 'BASE' | 'TOPUP';
  speed?: string;
  features?: string[];
  description?: string;
  salesCount?: number;
  rating?: number;
}

export interface PackageListParams {
  locationCode?: string;
  type?: 'BASE' | 'TOPUP';
  iccid?: string;
  page?: number;
  size?: number;
  /**
   * Optional server-side scope override:
   *   - undefined -> smart (region code -> multi, ISO -> strict single)
   *   - 'single'  -> force single-country match
   *   - 'multi'   -> force multi-country region match
   *   - 'any'     -> legacy loose "coverage contains this code" match
   */
  scope?: 'single' | 'multi' | 'any';
}

// ─── 订单模块类型 ────────────────────────────────────────────────────────

export type OrderType = 'ESIM' | 'PHYSICAL';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderDto {
  id: string;
  orderNo: string;
  type: OrderType;
  packageName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
}

export interface OrderDetailDto {
  id: string;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  amount: number;
  currency: string;
  package?: OrderPackageInfo;
  esim?: OrderEsimInfo;
  shipping?: OrderShippingInfo;
  payment?: OrderPaymentInfo;
  createdAt: string;
}

export interface OrderPackageInfo {
  packageCode: string;
  name: string;
  volume: number;
  duration: number;
}

export interface OrderEsimInfo {
  iccid: string;
  smdpAddress: string;
  activationCode: string;
  qrCodeUrl: string;
  lpaString: string;
  status: string;
  usedVolume: number;
  totalVolume: number;
  expiredTime: string;
}

export interface OrderShippingInfo {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  trackingNo?: string;
  carrier?: string;
}

export interface OrderPaymentInfo {
  method: string;
  transactionId: string;
  paidAt: string;
}

export interface CreateEsimOrderRequest {
  packageCode: string;
  email: string;
  quantity?: number;
}

export interface CreatePhysicalOrderRequest {
  productId: string;
  quantity: number;
  email: string;
  shippingAddress: CreateAddressRequest;
}

export interface CreateOrderResponse {
  orderNo: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  shippingFee?: number;
  totalAmount?: number;
  packageCode?: string;
  packageName?: string;
  createdAt: string;
}

export interface CreateTopupOrderRequest {
  iccid: string;
  packageCode: string;
  amount: number;
}

export interface CreateTopupOrderResponse {
  orderNo: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  iccid: string;
  packageCode: string;
  createdAt: string;
}

export interface OrderListParams {
  status?: OrderStatus;
  type?: OrderType;
  page?: number;
  size?: number;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface CancelOrderResponse {
  success: boolean;
  refundAmount?: number;
  refundStatus?: string;
}

export interface RefundRequest {
  reason: string;
  amount?: number;
}

export interface RefundResponse {
  refundId: string;
  status: string;
  amount: number;
  currency: string;
  estimatedDays: number;
}

export interface TrackingEvent {
  time: string;
  location: string;
  status: string;
  description: string;
}

export interface TrackingResponse {
  trackingNo: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

// ─── 支付模块类型 ────────────────────────────────────────────────────────

export type PaymentMethod = 'STRIPE' | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface CreatePaymentRequest {
  orderNo: string;
  method: PaymentMethod;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  paymentUrl: string;
  expiresAt: string;
}

export interface PaymentDto {
  paymentId: string;
  orderNo: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt?: string;
}

export interface ValidateCouponRequest {
  code: string;
  orderNo: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  couponId?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
}

export interface CouponDto {
  id: string;
  userCouponId: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  status: 'active' | 'used' | 'expired';
  startsAt?: string;
  expiresAt?: string;
}

// ─── eSIM 模块类型 ────────────────────────────────────────────────────────

export interface EsimDetailDto {
  iccid: string;
  status: string;
  package?: {
    packageCode: string;
    name: string;
    volume: number;
    duration: number;
  };
  usage?: {
    totalVolume: number;
    usedVolume: number;
    remainingVolume: number;
  };
  validity?: {
    activationDate: string;
    expiredTime: string;
    daysRemaining: number;
  };
  activation?: {
    smdpAddress: string;
    activationCode: string;
    qrCodeUrl: string;
    lpaString: string;
  };
}

export interface EsimUsageParams {
  daily?: boolean;
  page?: number;
  size?: number;
}

export interface EsimUsageDto {
  iccid: string;
  totalVolume: number;
  usedVolume: number;
  remainingVolume: number;
  usagePercent: number;
  expiredTime: string;
  dailyUsage?: Array<{
    date: string;
    usedVolume: number;
  }>;
  totalDays?: number;
  page?: number;
  size?: number;
}

// ─── 充值订单类型 ───────────────────────────────────────────────────────

export interface TopupRequest {
  iccid: string;
  packageCode: string;
  amount: number;
  supplierType?: 'esimaccess' | 'pccw';
}

export interface TopupResponse {
  rechargeId: number;
  orderId: string;
  status: 'PENDING_PAYMENT';
  amount: number;
  currency: string;
  iccid: string;
  packageCode: string;
  createdAt: string;
}

// ─── 充值支付类型 ───────────────────────────────────────────────────────

export type RechargePaymentMethod = 'stripe' | 'alipay' | 'wechat';

export interface CreatePaymentSessionRequest {
  paymentMethod?: RechargePaymentMethod;
}

export interface CreatePaymentSessionResponse {
  id: number;
  orderId: string;
  amount: number;
  currency: string;
  clientSecret: string;
  paymentIntentId: string;
}

export interface RechargeRecordDetailResponse {
  id: number;
  orderId: string;
  iccid: string;
  planName: string;
  packageCode: string;
  supplierType: string;
  dataAmount: number | null;
  dataDisplay: string;
  validityDays: number | null;
  amount: number;
  currency: string;
  orderStatus: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Refunded';
  paymentStatus: 'Unpaid' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  createdAt: string | null;
  paidAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

// ─── 邮件模块类型 ────────────────────────────────────────────────────────

export interface SendEsimDeliveryEmailRequest {
  email: string;
  orderNo: string;
  iccid: string;
  packageName: string;
  qrCodeUrl: string;
  smdpAddress: string;
  activationCode: string;
  lpaString: string;
}

export interface SendUsageAlertEmailRequest {
  email: string;
  iccid: string;
  usagePercent: number;
  remainingVolume: number;
  packageName: string;
}

export interface SendExpiryAlertEmailRequest {
  email: string;
  iccid: string;
  daysLeft: number;
  expiredTime: string;
  packageName: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
}