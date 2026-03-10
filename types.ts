export enum Tab {
  SIM_CARD = 'SIM_CARD',
  ESIM = 'ESIM',
  ECARD = 'ECARD',
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
  country: Country;
  plan: Plan;
  type: SimType;
  activationDate: string;
  expiryDate: string;
  dataTotalGB: number;
  dataUsedGB: number;
  phoneNumber?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_ACTIVATED' | 'PENDING_ACTIVATION';
  sharedWith?: User[];
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
}