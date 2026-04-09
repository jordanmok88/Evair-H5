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
  /** 供应商类型，固定为 PCCW */
  supplierType?: 'pccw';
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
  supplierType?: 'pccw';
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
  locationCode: string;    // e.g. "US" or "US,CA"
  locationName: string;    // resolved display name
  flag: string;            // ISO country code for primary country (for FlagIcon)
  packages: EsimPackage[];
  continent: string;       // e.g. "Asia", "Europe", "Americas", "Africa", "Oceania", "Multi-Region"
  isMultiRegion: boolean;
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