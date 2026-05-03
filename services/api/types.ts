/**
 * 后端 API 类型定义
 * 基于 docs/BACKEND_API_SPEC.md
 */

// ─── 通用响应类型 ───────────────────────────────────────────────────────

/**
 * The Laravel backend uses two response-code conventions on the same wire:
 *   - Legacy `/h5/*` endpoints: numeric `code` (0 = success, non-zero = error).
 *   - Newer `/v1/app/*` endpoints + chat + admin: string `code`
 *     (`'200'` / `'201'` = success, `'AUTH_001'` / `'BUSINESS_001'` /
 *     `'NOT_FOUND_001'` / etc. = error).
 *
 * `code` is widened to `number | string` so consumers can carry both
 * shapes through the type system. Use {@link isSuccessApiCode} from
 * `services/api/client` to test for success without hard-coding either
 * convention.
 */
export interface ApiResponse<T = unknown> {
  code: number | string;
  msg: string;
  data: T;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Laravel pagination envelope — used by App-tier endpoints (e.g. GET /app/orders).
 * Response shape: { data: T[], meta: { currentPage, lastPage, perPage, total } }
 */
export interface LaravelPaginatedData<T> {
  data: T[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
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

/**
 * App-tier user resource (GET/PUT /app/users/me).
 * Note: no `avatarUrl`, `role`, or `phone` field in App-tier.
 * Uses `avatar` instead of `avatarUrl`.
 */
export interface UserDto {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  source: number;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
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
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

/**
 * App-tier user-SIM binding resource (GET /app/users/sims).
 * Each item represents a user-SIM binding with a nested sim summary.
 */
export interface UserSimDto {
  id: number;
  appUserId: number;
  simId: number;
  role: 'owner' | 'member';
  status: 'active' | 'inactive';
  boundAt: string;
  createdAt: string;
  updatedAt: string;
  sim: {
    iccid: string;
    msisdn: string | null;
    status: 'active' | 'inactive';
    supplierId: number;
  };
}

export interface BindSimRequest {
  iccid: string;
  activationCode?: string;
}

/** App-tier unbind validates `sim_id` (matches `AppUserSim.sim_id` / `sims.id`). */
export interface UnbindSimRequest {
  simId: number;
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

/**
 * 后端 `/app/packages` 单条响应（已经过 client.ts 的 snake→camel 转换）。
 *
 * ⚠️ 历史坑：本类型早期把部分字段写成 snake_case（`is_multi_country`、
 * `supplier_package_code`），但 HTTP 层在响应入口统一做了 snake→camel，
 * 实际 JS 对象里的 key 已经是 camelCase。读 snake key 永远拿到 undefined，
 * 导致 dataService 里基于 `dto.is_multi_country` 的判断长期失效。
 * 现在统一改 camelCase 与运行时一致。
 *
 * 另一类坑：后端 PHP 把 `null` 字段也序列化进 JSON（不是省略），所以
 * `supplierRegionCode` 在单国包上拿到的是 `null` 而非 `undefined`。
 * 类型里把它声明为 `string | null` 让 TS 强制下游 nullish 检查。
 */
export interface PackageDto {
  packageCode: string;
  /** Red Tea packageCode for provisioning; never shown to users. */
  supplierPackageCode?: string;
  name: string;
  price: number;
  currency: string;
  volume: number;
  duration: number;
  durationUnit: 'DAY' | 'MONTH';
  /**
   * Primary ISO-2 country code (kept for back-compat with single-country
   * renderers). For a multi-country plan this is just the first entry of
   * {@link locations}; prefer `locations` / `isMultiCountry` when you need
   * to decide the "single vs multi-country" UX.
   */
  location: string;
  locationName: string;
  /**
   * Full ISO-2 list this plan covers. Single-country plans have length 1,
   * regional plans may have 2+ (e.g. ["US","CA","MX"] for North America),
   * global plans carry 100+ codes. Added to backend payload together with
   * `isMultiCountry` so clients can correctly group/filter.
   */
  locations?: string[];
  isMultiCountry?: boolean;
  type: 'BASE' | 'TOPUP';
  speed?: string;
  features?: string[];
  description?: string;
  salesCount?: number;
  rating?: number;
  /**
   * Supplier region code extracted from locations[], e.g. "NA-3", "EU-30".
   * Populated by App-tier PackageResource. **`null`** for single-country
   * plans (PHP serializes nulls into JSON, so it's not `undefined`).
   */
  supplierRegionCode?: string | null;
  /**
   * Friendly region name, e.g. "Europe (30+ countries)".
   * Populated by App-tier PackageResource (from supplier_regions table).
   * **`null`** for single-country plans.
   */
  supplierRegionName?: string | null;
  /** Operator line parsed from supplier `raw_data` when present (`esimaccess:sync-products`). */
  networkPartnerSummary?: string | null;
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

// ─── 地区 facets 类型 ─────────────────────────────────────────────────────
//
// Shop 首屏只用一次轻量请求拉这份索引，按需再去拉具体国家/区域的套餐详情。
// 后端聚合 min_price / package_count 在 PackageController::locations()。
//
// 注意：HTTP client 在响应入口统一做 snake_case → camelCase 转换，
// 所以前端拿到的字段是 camelCase（即便后端 PHP 端是 snake_case）。

/** 单国家筛选项（一国一行）。 */
export interface SingleCountryFacet {
  code: string;          // ISO-2，如 "JP"
  name: string;          // 国家名，如 "Japan"
  minPrice: number;      // 该国所有 BASE 套餐的最低售价（USD）
  packageCount: number;  // 该国在售 BASE 套餐数
}

/** 多国区域筛选项（一区域一行）。 */
export interface MultiCountryFacet {
  code: string;            // 供应商区域码，如 "NA-3"
  name: string;            // 区域显示名，如 "Europe (30+ countries)"
  countries: string[];     // 覆盖的纯 ISO-2 列表
  minPrice: number;        // 该区域所有 BASE 套餐的最低售价（USD）
  packageCount: number;    // 该区域在售 BASE 套餐数
}

/** GET /app/packages/locations 响应 data 段。 */
export interface PackageLocationsResponse {
  singleCountries: SingleCountryFacet[];
  multiCountries: MultiCountryFacet[];
}

// ─── 订单模块类型 ────────────────────────────────────────────────────────
//
// Migrated to App tier (/app/orders/*).
// Key differences from legacy H5 tier:
//   - `orderNumber` instead of `orderNo`
//   - Status values are lowercase: pending, paid, cancelled, etc.
//   - Amount is float in dollars (not integer cents)
//   - `id` is numeric (not string-encoded)
//   - Order list uses Laravel pagination (data[] + meta)

/** App-tier order type (lowercase) */
export type AppOrderType = 'package' | 'physical';

/** App-tier order status (lowercase) */
export type AppOrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

/** Legacy H5-tier order type — kept for backward compatibility */
export type OrderType = 'ESIM' | 'PHYSICAL';
/** Legacy H5-tier order status — kept for backward compatibility */
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

/**
 * Order list item — returned by GET /app/orders (inside `data[]`).
 * Mirrors App-tier OrderListResource after camelCase conversion.
 */
export interface OrderDto {
  /** Numeric DB primary key */
  id: number;
  /** e.g. "ORD-2024-001" */
  orderNumber: string;
  type: AppOrderType;
  status: AppOrderStatus;
  /** Amount in dollars (float), e.g. 19.99 */
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  /** Number of order items */
  itemsCount: number;
}

/**
 * Order detail — returned by GET /app/orders/{id} and POST /app/orders.
 * Mirrors App-tier OrderDetailResource after camelCase conversion.
 *
 * Note: `esim` and `payment` are not documented in the App-tier spec but
 * are kept as optional fields because the backend OrderProvisioningService
 * populates them on the same resource (used by pollEsimOrderUntilProvisioned).
 */
export interface OrderDetailDto {
  /** Numeric DB primary key */
  id: number;
  /** e.g. "ORD-2024-001" */
  orderNumber: string;
  type: AppOrderType;
  status: AppOrderStatus;
  /** Amount in dollars (float), e.g. 19.99 */
  amount: number;
  currency: string;
  paymentMethod: string | null;
  paymentIntentId: string | null;
  createdAt: string;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  items: OrderItemDto[];
  /**
   * Populated by OrderProvisioningService after SimAsset is created.
   * Used by pollEsimOrderUntilProvisioned to detect fulfillment success.
   */
  esim?: OrderEsimInfo;
  /** Legacy field — kept for useEsimCheckoutFlow (reads transactionId) */
  payment?: OrderPaymentInfo;
}

/** Individual order item (App-tier) */
export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string;
  iccid: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  productSnapshot?: {
    name: string;
    dataLimitBytes: number;
    validityDays: number;
    coverageCountries: string[];
  };
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

/**
 * Response from POST /app/orders (code "201").
 * Returns full OrderDetailResource — same shape as GET /app/orders/{id}.
 */
export type CreateOrderResponse = OrderDetailDto;

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
  status?: AppOrderStatus;
  type?: AppOrderType;
  page?: number;
  size?: number;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface CancelOrderResponse {
  data: null;
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
  paymentIntentId: string;
  clientSecret: string;
  orderNo: string;
  amount: number;
  currency: string;
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
  couponId: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  minOrderAmount: number;
  maxDiscount: number;
  expiresAt: string;
}

export interface CouponDto {
  id: string;
  userCouponId: string;
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  status: 'active' | 'used' | 'expired';
  startsAt: string;
  expiresAt: string;
}

// ─── eSIM 模块类型 ────────────────────────────────────────────────────────

export interface EsimDetailDto {
  iccid: string;
  status: string;
  supplierType: string;
  isEsim: boolean;
  packageName: string;
  countryCode: string;
  totalBytes: number;
  usedBytes: number;
  remainingBytes: number;
  totalVolume: number;
  usedVolume: number;
  remainingVolume: number;
  usagePercent: number;
  activatedAt: string;
  expiredAt: string;
  activationDate: string;
  expiredTime: string;
  lpaCode: string;
  lpaString: string;
  smdpAddress: string;
  activationCode: string;
  qrCodeUrl: string | null;
  isActive: boolean;
  isExpired: boolean;
  autoRenew: boolean;
  autoRenewNextChargeAt: string | null;
  autoRenewDisabledReason: string | null;
  createdAt: string;
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
  supplierType: 'esimaccess' | 'pccw';
}

/** POST /app/recharge (RechargeController@store) — replaces deprecated /h5/orders/topup */
export interface TopupResponse {
  id: number;
  orderId: string;
  orderStatus: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled' | 'Refunded';
  paymentStatus: 'Unpaid' | 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  amount: number;
  currency: string;
  iccid: string;
  packageCode: string;
}

// ─── 充值支付类型 ───────────────────────────────────────────────────────

export type RechargePaymentMethod = 'stripe' | 'alipay' | 'wechat';

export interface CreatePaymentSessionRequest {
  paymentMethod?: RechargePaymentMethod;
}

/** POST /app/recharge/{id}/pay (PaymentController@createRechargePayment) */
export interface CreatePaymentSessionResponse {
  paymentId: string;
  paymentIntentId: string;
  clientSecret: string;
  orderNo: string;
  amount: number;
  currency: string;
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