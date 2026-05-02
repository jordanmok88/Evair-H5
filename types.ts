export enum Tab {
  SIM_CARD = 'SIM_CARD',
  ESIM = 'ESIM',
  INBOX = 'INBOX',
  PROFILE = 'PROFILE',
  DIALER = 'DIALER',
  SHOP = 'SHOP',
  SETTINGS = 'SETTINGS',
  MYSIMS = 'MYSIMS'
}

export type SimType = 'ESIM' | 'PHYSICAL';

export interface Plan {
  id: string;
  name: string;
  data: string;
  days: number;
  price: number;
  features: string[];
  isPopular?: boolean;
  isBestValue?: boolean;
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  countryCode: string;
  region: string;
  startPrice: number;
  networkCount: number;
  networks: string[];
  vpmn: string; // Single VPMN per country per supplier PDF
  vpn: boolean;
  plans: Plan[];
  isPopular?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: 'OWNER' | 'MEMBER';
}

export interface ActiveSim {
  id: string;
  iccid?: string;
  country: Country;
  locationCode?: string;
  plan: Plan;
  type: SimType;
  activationDate: string;
  expiryDate: string;
  dataTotalGB: number;
  dataUsedGB: number;
  phoneNumber?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_ACTIVATED' | 'PENDING_ACTIVATION' | 'NEW' | 'ONBOARD' | 'IN_USE';
  sharedWith?: User[];
  orderNo?: string;
  trackingNumber?: string;
  purchaseSource?: 'IN_APP' | 'MARKETPLACE';
}

export interface Order {
  id: string;
  countryName: string;
  flag: string;
  planName: string;
  price: number;
  status: 'PENDING' | 'PAID' | 'ACTIVE' | 'EXPIRED';
  date: string;
  type: SimType;
}

/** Physical SIM card product from catalog (e.g. from Excel) for purchase */
export interface SimCardProduct {
  id: string;
  slug: string;
  region: string;
  coverage: string;
  sellingPrice: number;
  gbs: number;
  validityDays: number;
  speed: string;
  topUpType: string;
  productId: string; // backend/operator ID
}

export type ECardType = 'E1' | 'E2' | 'E2_PRO';

export interface ECardProfile {
  id: string;
  name: string;
  country: Country;
  status: 'ACTIVE' | 'INACTIVE' | 'DOWNLOADING';
  dataUsedGB: number;
  dataTotalGB: number;
  daysLeft: number;
}

export interface ECard {
  id: string;
  eid: string;
  cardType: ECardType;
  label: string;
  status: 'BOUND' | 'UNBOUND';
  boundDate?: string;
  profiles: ECardProfile[];
  maxProfiles: number;
  downloadCount: number;
  maxDownloads: number; // -1 = unlimited
}

// ─── eSIM Access (Red Tea) API Types ────────────────────────────────

export interface EsimPackage {
  packageCode: string;
  name: string;
  price: number;          // micro-cents (divide by 10 000 for USD)
  currencyCode: string;
  volume: number;          // bytes
  unusedValidTime: number; // days the package stays valid before first use
  duration: number;
  durationUnit: 'DAY' | 'MONTH';
  location: string;        // comma-separated ISO country codes, e.g. "US,CA"
  description: string;
  activeType: number;      // 1 = auto-activate on first data use

  /**
   * When true, `price` is already the retail USD value the team set in the
   * backstage admin (× 10 000). Skip the legacy 2× wholesale-→-retail markup.
   * Set by the backstage fetcher; absent / false for legacy Red Tea packages.
   */
  priceIsRetail?: boolean;

  /**
   * Raw ISO-2 coverage list (multi-country plans). For single-country plans
   * this is `[location]`. The supplier region suffix (e.g. "NA-3") is
   * stripped so this list is purely ISO codes — use it for accurate country
   * counts and flag rendering. Downstream grouping uses `supplierRegionCode`.
   */
  coverageCodes?: string[];

  /**
   * Supplier-issued multi-country region code, e.g. "NA-3", "EU-30", "AS-12".
   * Present only for multi-country plans. When set, this is the canonical
   * grouping key so H5 lines up with the 33 curated regions surfaced by
   * /v1/h5/packages/locations (which the APP consumes directly).
   */
  supplierRegionCode?: string;

  /**
   * Friendly name for the multi-country region, e.g. "Europe (30+ countries)".
   * Populated by the backend (supplier_regions table), so the frontend no
   * longer needs a separate /packages/locations request for region names.
   */
  supplierRegionName?: string;

  /** Red Tea-derived operator line via Laravel sync; optional. */
  networkPartnerSummary?: string;
}

export interface EsimApiResponse<T> {
  errorCode: string | null;
  errorMsg: string | null;
  success: boolean;
  obj: T;
}

export interface PackageListPayload {
  packageList: EsimPackage[];
}

export interface EsimOrderRequest {
  packageCode: string;
  transactionId: string;
  amount: number;
  count?: number;          // batch quantity, default 1
}

export interface EsimOrderRawResult {
  orderNo: string;
  transactionId: string;
}

/** eSIM details returned from query after ordering */
export interface EsimQueryItem {
  esimTranNo: string;
  orderNo: string;
  transactionId: string;
  iccid: string;
  ac: string;
  qrCodeUrl: string;
  shortUrl: string;
  smdpStatus: string;
  esimStatus: string;
  totalVolume: number;
  totalDuration: number;
  durationUnit: string;
  expiredTime: string;
  packageList: { packageName: string; packageCode: string }[];
}

export interface EsimQueryPayload {
  esimList: EsimQueryItem[];
  pager: { pageSize: number; pageNum: number; total: number };
}

/** Normalized eSIM order result for UI consumption */
export interface EsimOrderResult {
  orderNo: string;
  transactionId: string;
  iccid: string;
  smdpAddress: string;
  activationCode: string;
  qrCodeUrl: string;
  shortUrl: string;
  lpaString: string;
}

export interface EsimProfileResult {
  iccid: string;
  packageCode: string;
  packageName: string;
  status: string;
  /** Raw SM-DP+ status from supplier (RELEASED | DOWNLOADED | INSTALLED | ENABLED | DISABLED) */
  smdpStatus?: string;
  expiredTime: string;
  totalVolume: number;
  usedVolume: number;
  totalDuration: number;
}

export interface EnableProfileResult {
  success: boolean;
  status: string;
}

export interface DataUsageResult {
  iccid: string;
  totalVolume: number;
  usedVolume: number;
  expiredTime: string;
}

export interface TopUpRequest {
  iccid: string;
  packageCode: string;
  transactionId: string;
  amount: number;
  /**
   * Internal supplier-routing hint sent to the backend so the right adapter
   * is invoked. NEVER render this value in user-facing copy — supplier
   * upstream supplier identity is commercially confidential.
   */
  supplierType?: 'esimaccess' | 'pccw';
}

export interface TopUpResult {
  transactionId: string;
  iccid: string;
  expiredTime: string;
  totalVolume: number;
  totalDuration: number;
  orderUsage: number;
}

// Grouped packages for UI display
export interface EsimCountryGroup {
  /**
   * Group identity. For single-country groups this is the ISO code ("US").
   * For multi-country groups with a supplier region code this is the region
   * code ("NA-3", "EU-30") so grouping matches the APP's curated regions.
   * For the remaining multi-country plans that don't carry a region code,
   * this is the raw CSV of ISO codes as a last-resort fallback.
   */
  locationCode: string;
  locationName: string;    // resolved display name
  flag: string;            // ISO country code for primary country (for FlagIcon)
  /**
   * Detail packages for this country/region.
   *
   * In the legacy "fetch-all + client-group" flow this was eagerly
   * populated by `groupPackagesByLocation`. In the new facets-driven
   * flow it starts as `[]` and is filled on demand when the user opens
   * the country detail card (see `fetchPackagesForGroup` in dataService).
   * UIs that just need card metadata should read `minPrice` /
   * `packageCount` instead of `packages.length` / `packages[0].price`.
   */
  packages: EsimPackage[];
  continent: string;       // e.g. "Asia", "Europe", "Americas", "Africa", "Oceania", "Multi-Region"
  isMultiRegion: boolean;
  /**
   * Pure ISO-2 coverage list for multi-country groups (region suffix removed).
   * Use `countries.length` for the "+N countries" badge — splitting
   * `locationCode` by comma no longer works once we key on region code.
   */
  countries: string[];
  /**
   * Lowest USD retail price across this group's BASE packages.
   * Provided by the backend `/packages/locations` facets endpoint so the
   * shop grid can render "from $X" without preloading any package detail.
   * Optional for back-compat with code paths that still build groups via
   * client-side `groupPackagesByLocation`.
   */
  minPrice?: number;
  /**
   * Total in-stock BASE package count for this group, also from the
   * `/packages/locations` facets endpoint. Used to render the "N Plans"
   * sub-label on the country card before detail packages are loaded.
   */
  packageCount?: number;
}

// ─── End eSIM Access API Types ──────────────────────────────────────

export type NotificationType = 'data_low' | 'expiring' | 'order' | 'promo' | 'service';

export interface AppNotification {
  id: string;
  type: NotificationType;
  titleKey: string;
  bodyKey: string;
  date: string;
  read: boolean;
  actionLabel?: string;
  countryCode?: string;
  planName?: string;
  orderNo?: string;
}

// ─── Chat Types ──────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'customer' | 'ai' | 'agent';
  agentName?: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}