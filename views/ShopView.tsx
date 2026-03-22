import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, ArrowLeft, Globe, Star, X, MapPin, Loader2, Smartphone, Truck, CheckCircle, Calendar, Wifi, Signal, Info, CreditCard, ArrowDown, ShoppingBag, QrCode, Copy, Check, RefreshCw, Zap, Clock, Shield, Mail } from 'lucide-react';
import { Country, Plan, SimType, User, SimCardProduct, EsimPackage, EsimCountryGroup, EsimOrderResult } from '../types';
import { MOCK_COUNTRIES, SIM_CARD_PRODUCTS } from '../constants';
import FlagIcon from '../components/FlagIcon';
import { fetchPackages, prefetchPackages, groupPackagesByLocation, formatVolume, formatPrice, retailPrice, orderEsim, getPopularGroups, CONTINENT_TABS, type ContinentTab } from '../services/esimApi';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { packageService } from '../services/api';
import type { PackageDto } from '../services/api/types';

import { Bell, UserCircle } from 'lucide-react';
import { AppNotification } from '../types';

interface ShopViewProps {
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  onPurchaseComplete: (purchaseInfo?: { planName?: string; countryCode?: string; type?: SimType; orderNo?: string; iccid?: string }) => void;
  simType: SimType;
  onSwitchToMySims?: () => void;
  hasActiveSims?: boolean;
  onSwitchToSetup?: () => void;
  onAddCard?: (iccid: string) => void;
  onNavigate?: (tab: string) => void;
  onSwitchSimType?: (type: SimType) => void;
  notifications?: AppNotification[];
}

// ─── 国家/地区信息映射 ────────────────────────────────────────────────

const COUNTRY_CODE_MAP: Record<string, { name: string; continent: string }> = {
  'US': { name: 'United States', continent: 'Americas' },
  'CN': { name: 'China', continent: 'Asia' },
  'JP': { name: 'Japan', continent: 'Asia' },
  'KR': { name: 'South Korea', continent: 'Asia' },
  'GB': { name: 'United Kingdom', continent: 'Europe' },
  'AU': { name: 'Australia', continent: 'Oceania' },
  'CA': { name: 'Canada', continent: 'Americas' },
  'DE': { name: 'Germany', continent: 'Europe' },
  'FR': { name: 'France', continent: 'Europe' },
  'SG': { name: 'Singapore', continent: 'Asia' },
  'TH': { name: 'Thailand', continent: 'Asia' },
  'MY': { name: 'Malaysia', continent: 'Asia' },
  'ID': { name: 'Indonesia', continent: 'Asia' },
  'VN': { name: 'Vietnam', continent: 'Asia' },
  'PH': { name: 'Philippines', continent: 'Asia' },
  'TW': { name: 'Taiwan', continent: 'Asia' },
  'HK': { name: 'Hong Kong', continent: 'Asia' },
  'IN': { name: 'India', continent: 'Asia' },
  'BR': { name: 'Brazil', continent: 'Americas' },
  'TR': { name: 'Turkey', continent: 'Europe' },
  'MX': { name: 'Mexico', continent: 'Americas' },
  'ES': { name: 'Spain', continent: 'Europe' },
  'IT': { name: 'Italy', continent: 'Europe' },
  'NL': { name: 'Netherlands', continent: 'Europe' },
  'CH': { name: 'Switzerland', continent: 'Europe' },
  'SE': { name: 'Sweden', continent: 'Europe' },
  'NO': { name: 'Norway', continent: 'Europe' },
  'DK': { name: 'Denmark', continent: 'Europe' },
  'FI': { name: 'Finland', continent: 'Europe' },
  'NZ': { name: 'New Zealand', continent: 'Oceania' },
  'AE': { name: 'United Arab Emirates', continent: 'Asia' },
  'SA': { name: 'Saudi Arabia', continent: 'Asia' },
  'ZA': { name: 'South Africa', continent: 'Africa' },
  'EG': { name: 'Egypt', continent: 'Africa' },
  'RU': { name: 'Russia', continent: 'Europe' },
  'PL': { name: 'Poland', continent: 'Europe' },
  'BE': { name: 'Belgium', continent: 'Europe' },
  'AT': { name: 'Austria', continent: 'Europe' },
  'PT': { name: 'Portugal', continent: 'Europe' },
  'GR': { name: 'Greece', continent: 'Europe' },
  'CZ': { name: 'Czech Republic', continent: 'Europe' },
  'HU': { name: 'Hungary', continent: 'Europe' },
  'IE': { name: 'Ireland', continent: 'Europe' },
};

// ─── 后端套餐数据转换为前端格式 ────────────────────────────────────────

function convertPackageDtoToEsimPackage(dto: PackageDto): EsimPackage {
  // volume: backend returns GB, need to convert to bytes
  const volumeBytes = dto.volume * 1024 * 1024 * 1024;

  return {
    packageCode: dto.packageCode,
    name: dto.name,
    price: dto.price * 10000, // backend returns USD, convert to micro-cents
    currencyCode: dto.currency,
    volume: volumeBytes,
    unusedValidTime: 0,
    duration: dto.duration,
    durationUnit: dto.durationUnit,
    location: dto.location,
    description: dto.description || '',
    activeType: 1,
  };
}

type LocationInfo = {
  code: string;
  name: string;
  packageCount: number;
};

// 多国区域信息 (用于显示区域如 "Asia (12 areas)")
type MultiCountryRegion = {
  code: string;
  name: string;
};

// 单国家信息
type SingleCountry = {
  code: string;
  name: string;
  regionCode?: string; // 所属区域代码
};

// 区域代码到国家代码的映射 (从后端返回的数据构建)
const REGION_TO_COUNTRIES: Record<string, string[]> = {
  // 这些映射会在运行时从 multi_countries 数据中推断
};

function convertPackagesToGroups(
  packages: PackageDto[],
  locationMap?: Map<string, LocationInfo>
): EsimCountryGroup[] {
  const map = new Map<string, PackageDto[]>();

  for (const pkg of packages) {
    const key = pkg.location;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(pkg);
  }

  const groups: EsimCountryGroup[] = [];
  for (const [loc, pkgs] of map.entries()) {
    const primaryCode = loc.split(',')[0].trim().toUpperCase();
    const isMultiRegion = loc.includes(',');

    // 优先使用后端返回的地区信息，其次使用本地映射
    const backendLocation = locationMap?.get(primaryCode);
    const localCountry = COUNTRY_CODE_MAP[primaryCode];
    const countryName = backendLocation?.name || localCountry?.name || primaryCode;
    const continent = backendLocation?.packageCount !== undefined
      ? (localCountry?.continent || 'Other')
      : (localCountry?.continent || 'Other');

    const esimPackages = pkgs
      .sort((a, b) => a.volume - b.volume)
      .map(convertPackageDtoToEsimPackage);

    groups.push({
      locationCode: loc.toUpperCase(),
      locationName: countryName,
      flag: primaryCode,
      packages: esimPackages,
      continent: isMultiRegion ? 'Multi-Region' : continent,
      isMultiRegion,
    });
  }

  groups.sort((a, b) => a.locationName.localeCompare(b.locationName));
  return groups;
}

// 将多国区域和单国家分组
interface LocationGroups {
  multiCountryRegions: MultiCountryRegion[];
  singleCountries: SingleCountry[];
}

// 全局存储区域到国家的映射
let regionToCountriesMap: Record<string, string[]> = {};

// 判断套餐是否属于某个区域 (通过检查套餐的 location 是否包含该区域的任一国家)
function isPackageInRegion(packageLocation: string, regionCode: string): boolean {
  const countries = regionToCountriesMap[regionCode];
  if (!countries) return false;

  // packageLocation 可能是逗号分隔的国家代码列表，如 "AF,AL,DZ"
  const locationCodes = packageLocation.split(',').map(c => c.trim().toUpperCase());

  // 检查是否有任何一个国家属于该区域
  return locationCodes.some(code => countries.includes(code));
}

function parseLocationsResponse(
  locationsResponse: any
): LocationGroups {
  const multiCountryRegions: MultiCountryRegion[] = [];
  const singleCountries: SingleCountry[] = [];

  // 优先检测 snake_case 格式 (后端实际返回)
  const singleCountriesData = locationsResponse.single_countries || locationsResponse.singleCountries || [];
  const multiCountriesData = locationsResponse.multi_countries || locationsResponse.multiCountries || [];

  // 构建区域前缀到区域代码的映射
  // 例如: "AF-29" 表示 Africa 区域，包含以 "AF" 开头的国家
  const regionPrefixMap: Record<string, string> = {};

  for (const region of multiCountriesData) {
    multiCountryRegions.push({
      code: region.code,
      name: region.name || region.code,
    });

    // 提取区域前缀 (如 "AF-29" -> "AF")
    const prefix = region.code.split('-')[0];
    regionPrefixMap[prefix] = region.code;
  }

  // 重置映射
  regionToCountriesMap = {};

  for (const country of singleCountriesData) {
    const countryCode = country.code;
    const countryName = country.name || country.code;

    // 找出这个国家属于哪个区域
    let regionCode: string | undefined;
    for (const [prefix, region] of Object.entries(regionPrefixMap)) {
      if (countryCode.startsWith(prefix)) {
        regionCode = region;
        break;
      }
    }

    singleCountries.push({
      code: countryCode,
      name: countryName,
      regionCode,
    });

    // 添加到区域映射
    if (regionCode) {
      if (!regionToCountriesMap[regionCode]) {
        regionToCountriesMap[regionCode] = [];
      }
      regionToCountriesMap[regionCode].push(countryCode);
    }
  }

  return { multiCountryRegions, singleCountries };
}

const ShopView: React.FC<ShopViewProps> = ({ isLoggedIn, user, onLoginRequest, onPurchaseComplete, simType, onSwitchToMySims, hasActiveSims, onSwitchToSetup, onAddCard, onNavigate, onSwitchSimType, notifications = [] }) => {
  const { t } = useTranslation();
  const TOP_COUNTRY_COUNT = 10;
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedSimCardProduct, setSelectedSimCardProduct] = useState<SimCardProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCountries, setShowAllCountries] = useState(false);
  
  // Checkout State
  const [address, setAddress] = useState('123 Tech Park, San Francisco, CA'); 
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // eSIM API state
  const [esimGroups, setEsimGroups] = useState<EsimCountryGroup[]>([]);
  const [esimLoading, setEsimLoading] = useState(false);
  const [esimError, setEsimError] = useState<string | null>(null);
  const [selectedEsimGroup, setSelectedEsimGroup] = useState<EsimCountryGroup | null>(null);
  const [selectedEsimPkg, setSelectedEsimPkg] = useState<EsimPackage | null>(null);
  const [esimOrderResult, setEsimOrderResult] = useState<EsimOrderResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [continentTab, setContinentTab] = useState<ContinentTab>('All');
  const [browseMode, setBrowseMode] = useState<'country' | 'region'>('country');

  // 后端返回的地区数据 (多国区域 + 单国家)
  const [multiCountryRegions, setMultiCountryRegions] = useState<MultiCountryRegion[]>([]);
  const [singleCountries, setSingleCountries] = useState<SingleCountry[]>([]);

  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = (y: number) => {
      if (y > lastScrollY.current + scrollThreshold && y > 60) {
        setHeaderHidden(true);
      } else if (y < lastScrollY.current - scrollThreshold) {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };

    const onWindowScroll = () => onScroll(window.scrollY);
    const onContainerScroll = () => {
      if (scrollContainerRef.current) onScroll(scrollContainerRef.current.scrollTop);
    };

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', onContainerScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      container?.removeEventListener('scroll', onContainerScroll);
    };
  }, []);

  const loadEsimPackages = useCallback(async (force = false) => {
    setEsimLoading(true);
    setEsimError(null);
    try {
      // Use eSIMAccess API directly via Netlify proxy (backend not yet syncing real package data)
      const packages = force ? await fetchPackages() : await prefetchPackages();
      const groups = groupPackagesByLocation(packages);
      setEsimGroups(groups);
    } catch (err: any) {
      setEsimError(err.message || 'Failed to load packages');
    } finally {
      setEsimLoading(false);
    }
  }, []);

  useEffect(() => {
    if (simType === 'ESIM') {
      loadEsimPackages();
    }
  }, [simType, loadEsimPackages]);

  // Swipe-back gesture support
  const navDepth =
    (selectedCountry || selectedEsimGroup ? 1 : 0) +
    (selectedEsimPkg || selectedSimCardProduct || selectedPlan ? 1 : 0) +
    (esimOrderResult || showSuccess ? 1 : 0);

  const handleSwipeBack = useCallback(() => {
    if (showSuccess) { setShowSuccess(false); return; }
    if (esimOrderResult) { setEsimOrderResult(null); setSelectedEsimPkg(null); setSelectedEsimGroup(null); return; }
    if (selectedEsimPkg) { setSelectedEsimPkg(null); return; }
    if (selectedSimCardProduct) { setSelectedSimCardProduct(null); return; }
    if (selectedPlan) { setSelectedPlan(null); return; }
    if (selectedEsimGroup) { setSelectedEsimGroup(null); return; }
    if (selectedCountry) { setSelectedCountry(null); return; }
  }, [showSuccess, esimOrderResult, selectedEsimPkg, selectedSimCardProduct, selectedPlan, selectedEsimGroup, selectedCountry]);

  useSwipeBack(navDepth, handleSwipeBack);

  // Popular destinations (derived from full list)
  const popularGroups = getPopularGroups(esimGroups);

  // Filter eSIM groups by search + browse mode + continent tab
  const filteredEsimGroups = esimGroups.filter(g => {
    const matchesSearch = !searchQuery ||
      g.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.locationCode.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (searchQuery) return true;
    const matchesBrowseMode = browseMode === 'region' ? g.isMultiRegion : !g.isMultiRegion;
    const matchesTab = browseMode === 'region' || continentTab === 'All' || g.continent === continentTab;
    return matchesBrowseMode && matchesTab;
  });
  const shouldLimitEsim = !searchQuery && !showAllCountries;
  const visibleEsimGroups = shouldLimitEsim
    ? filteredEsimGroups.slice(0, TOP_COUNTRY_COUNT)
    : filteredEsimGroups;
  const hiddenEsimCount = Math.max(filteredEsimGroups.length - TOP_COUNTRY_COUNT, 0);

  // Filter mock countries (fallback / physical)
  const filteredCountries = MOCK_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const shouldLimitCountries = !searchQuery && !showAllCountries;
  const visibleCountries = shouldLimitCountries
    ? filteredCountries.slice(0, TOP_COUNTRY_COUNT)
    : filteredCountries;
  const hiddenCountryCount = Math.max(filteredCountries.length - TOP_COUNTRY_COUNT, 0);

  const handlePlanClick = (plan: Plan) => {
    if (!isLoggedIn) {
      onLoginRequest();
    } else {
      setSelectedPlan(plan);
    }
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
        setIsProcessing(false);
        setShowSuccess(true);
        
        // Wait for animation then redirect
        setTimeout(() => {
           setShowSuccess(false);
           const planInfo = { planName: selectedPlan?.name, countryCode: selectedCountry?.countryCode, type: simType as SimType };
           setSelectedPlan(null);
           setSelectedCountry(null);
           onPurchaseComplete(planInfo);
        }, 2000);
    }, 1500);
  };

  const handleCheckoutSimCard = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        const planInfo = { planName: `${selectedSimCardProduct?.gbs}GB ${selectedSimCardProduct?.validityDays}Days`, countryCode: 'US', type: 'PHYSICAL' as SimType };
        setSelectedSimCardProduct(null);
        onPurchaseComplete(planInfo);
      }, 2000);
    }, 1500);
  };

  const handleOrderEsim = async () => {
    if (!selectedEsimPkg) return;
    setIsProcessing(true);
    setOrderError(null);
    setEmailSent(false);
    try {
      const txnId = `evair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = await orderEsim({
        packageCode: selectedEsimPkg.packageCode,
        transactionId: txnId,
        amount: selectedEsimPkg.price,
      });
      setEsimOrderResult(result);

      if (email) {
        fetch('/.netlify/functions/send-esim-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            qrCodeUrl: result.qrCodeUrl,
            smdpAddress: result.smdpAddress,
            activationCode: result.activationCode,
            lpaString: result.lpaString,
            orderNo: result.orderNo,
            packageName: selectedEsimGroup?.locationName || selectedEsimPkg.name,
          }),
        })
          .then(r => { if (r.ok) setEmailSent(true); })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('eSIM order error:', err);
      setOrderError(err.message || 'Order failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // --- SUCCESS OVERLAY (Ultra Thick Material) ---
  if (showSuccess) {
      return (
          <div className="absolute inset-0 z-[70] bg-white/60 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-lg">
                  <CheckCircle size={48} className="text-[#34C759]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{t('shop.order_confirmed')}</h2>
              <p className="text-slate-500 text-center mb-8 font-medium">
                  {simType === 'ESIM' ? t('shop.esim_generating') : t('shop.sim_preparing')}.
              </p>
              <Loader2 className="animate-spin text-brand-orange" />
          </div>
      );
  }

  // --- eSIM ORDER RESULT: QR Code / Install Info ---
  if (esimOrderResult) {
    const { smdpAddress, activationCode, lpaString, qrCodeUrl } = esimOrderResult;
    return (
      <div className="sm:h-full min-h-screen sm:min-h-0 flex flex-col bg-[#1c1c1e]">
        <div className="px-5 pt-safe pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-white text-xl font-bold tracking-tight">{t('shop.order_success_title')}</h2>
          <button onClick={() => {
            const info = { planName: selectedEsimGroup?.locationName, countryCode: selectedEsimGroup?.locationCode.split(',')[0], type: 'ESIM' as SimType, orderNo: esimOrderResult.orderNo, iccid: esimOrderResult.iccid };
            setEsimOrderResult(null); setSelectedEsimPkg(null); setSelectedEsimGroup(null); onPurchaseComplete(info);
          }} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-5 pb-2 gap-4 overflow-y-auto no-scrollbar">
          <p className="text-white/60 text-sm text-center mt-2">{t('shop.order_success_subtitle')}</p>

          {emailSent && (
            <div className="flex items-center justify-center gap-1.5 bg-emerald-500/15 rounded-xl py-2 px-3">
              <Mail size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">Details also sent to {email}</span>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white rounded-2xl px-5 py-4 flex flex-col items-center">
            <div className="bg-slate-50 p-2 rounded-xl mb-2.5 border border-slate-100">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="eSIM QR Code" loading="lazy" width={160} height={160} className="w-40 h-40 rounded-lg object-contain" />
              ) : (
                <div className="w-32 h-32 bg-slate-900 rounded-lg flex items-center justify-center">
                  <QrCode size={48} className="text-white/60" />
                </div>
              )}
            </div>
            <p className="text-center text-slate-500 text-xs mb-2.5 max-w-[240px] leading-relaxed font-medium">
              {t('my_sims.scan_instructions')}
            </p>
            <button
              onClick={() => handleCopyText(lpaString, 'qr')}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 border ${
                copiedField === 'qr'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-orange-50 text-brand-orange border-orange-100 hover:bg-orange-100'
              }`}
            >
              {copiedField === 'qr' ? <Check size={16} /> : <Copy size={16} />}
              {copiedField === 'qr' ? t('my_sims.copied') : t('my_sims.copy_qr_data')}
            </button>
          </div>

          {/* SM-DP+ Address */}
          {smdpAddress && (
            <div className={`rounded-xl p-3.5 border transition-colors ${copiedField === 'smdp' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
              <p className="text-white/50 text-[11px] uppercase font-bold tracking-wider mb-2">{t('my_sims.smdp_address')}</p>
              <button
                onClick={() => handleCopyText(smdpAddress, 'smdp')}
                className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 active:scale-[0.98] transition-transform"
              >
                <code className="text-white font-mono text-sm truncate mr-3">{smdpAddress}</code>
                <span className="flex items-center gap-1.5 shrink-0">
                  {copiedField === 'smdp' ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><Check size={14} />{t('my_sims.copied')}</span>
                  ) : (
                    <span className="text-brand-orange text-xs font-semibold flex items-center gap-1"><Copy size={14} />{t('my_sims.tap_to_copy')}</span>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Activation Code */}
          {activationCode && (
            <div className={`rounded-xl p-3.5 border transition-colors ${copiedField === 'activation' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
              <p className="text-white/50 text-[11px] uppercase font-bold tracking-wider mb-2">{t('my_sims.activation_code')}</p>
              <button
                onClick={() => handleCopyText(activationCode, 'activation')}
                className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 active:scale-[0.98] transition-transform"
              >
                <code className="text-white font-mono text-[13px] truncate mr-3">{activationCode}</code>
                <span className="flex items-center gap-1.5 shrink-0">
                  {copiedField === 'activation' ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><Check size={14} />{t('my_sims.copied')}</span>
                  ) : (
                    <span className="text-brand-orange text-xs font-semibold flex items-center gap-1"><Copy size={14} />{t('my_sims.tap_to_copy')}</span>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Order Reference */}
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <p className="text-white/50 text-[11px] uppercase font-bold tracking-wider mb-1">Order Reference</p>
            <p className="text-white font-mono text-sm">{esimOrderResult.orderNo}</p>
          </div>
        </div>
        <div className="shrink-0 px-5 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <button
            onClick={() => {
              const info = { planName: selectedEsimGroup?.locationName, countryCode: selectedEsimGroup?.locationCode.split(',')[0], type: 'ESIM' as SimType, orderNo: esimOrderResult.orderNo, iccid: esimOrderResult.iccid };
              setEsimOrderResult(null); setSelectedEsimPkg(null); setSelectedEsimGroup(null); onPurchaseComplete(info);
            }}
            className="w-full bg-brand-orange text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
          >
            {t('my_sims.done')}
          </button>
        </div>
      </div>
    );
  }

  // --- eSIM COUNTRY DETAIL: Package list for selected country group ---
  if (selectedEsimGroup) {
    return (
      <div className="sm:h-full flex flex-col relative bg-[#F2F4F7]">
        {/* eSIM Checkout Modal */}
        {selectedEsimPkg && (
          <div className="fixed md:absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white w-full sm:w-[90%] sm:max-w-sm max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl overflow-y-auto overscroll-contain">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.checkout')}</h2>
                <button onClick={() => setSelectedEsimPkg(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('shop.selected_plan')}</p>
                <p className="font-bold text-slate-900 text-base mt-1">{selectedEsimGroup.locationName}</p>
                <p className="text-sm text-slate-500 font-medium">{selectedEsimPkg.name}</p>
                <p className="text-sm text-slate-500">{formatVolume(selectedEsimPkg.volume)} / {selectedEsimPkg.duration} {selectedEsimPkg.durationUnit === 'DAY' ? t('shop.days') : 'Months'}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                  <span className="text-sm text-slate-500">eSIM (Digital)</span>
                  <span className="text-xl font-bold text-brand-orange">${retailPrice(selectedEsimPkg.price).toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-5 bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-3 text-brand-orange">
                <Smartphone size={22} />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('shop.product_type')}</p>
                  <p className="font-bold text-sm">{t('shop.esim_digital')}</p>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.email_address')}</label>
                <div className="relative">
                  <svg className="absolute left-3 top-3 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input
                    type="email"
                    placeholder={t('shop.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
              </div>

              {orderError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  {orderError}
                </div>
              )}

              <button
                onClick={handleOrderEsim}
                disabled={isProcessing || !email.includes('@')}
                className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <>{t('shop.order_esim')} ${retailPrice(selectedEsimPkg.price).toFixed(2)}</>}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 sticky top-0 z-40">
          <div className="flex items-center">
            <button
              onClick={() => setSelectedEsimGroup(null)}
              className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 text-slate-900 transition-colors"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 ml-2 tracking-tight">{selectedEsimGroup.locationName}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="sm:flex-1 sm:overflow-y-auto no-scrollbar pb-6 px-4 pt-5">
          {/* Country header */}
          <div className="flex items-center gap-4 mb-5">
            <FlagIcon countryCode={selectedEsimGroup.flag} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedEsimGroup.locationName}</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedEsimGroup.locationCode.includes(',') ? t('shop.multi_region') : t('shop.single_country')}
                {' · '}{selectedEsimGroup.packages.length} {selectedEsimGroup.packages.length === 1 ? 'Plan' : 'Plans'}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">{t('shop.select_plan')}</h3>

          <div className="space-y-3">
            {selectedEsimGroup.packages.map((pkg) => {
              const priceUsd = retailPrice(pkg.price);
              const volumeStr = formatVolume(pkg.volume);
              const gb = pkg.volume / (1024 * 1024 * 1024);
              const pricePerGb = gb > 0 ? priceUsd / gb : priceUsd;
              const isAutoActivate = pkg.activeType === 1;
              const coveredCountries = pkg.location ? pkg.location.split(',').length : 1;
              return (
                <div
                  key={pkg.packageCode}
                  onClick={() => {
                    if (!isLoggedIn) { onLoginRequest(); return; }
                    setSelectedEsimPkg(pkg);
                  }}
                  className="group relative bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">{pkg.name}</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{volumeStr.split(' ')[0]}</h3>
                        <span className="text-base font-bold text-slate-400">{volumeStr.split(' ')[1]}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-brand-orange">${priceUsd.toFixed(2)}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">${pricePerGb.toFixed(2)}{t('shop.per_gb')}</p>
                    </div>
                  </div>

                  {/* Plan details grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <Calendar size={16} className="text-slate-500" />
                      <span className="font-semibold text-slate-700 text-xs">{pkg.duration} {pkg.durationUnit === 'DAY' ? t('shop.days') : 'Mo'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <Signal size={16} className="text-slate-500" />
                      <span className="font-semibold text-slate-700 text-xs">4G/5G</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <Wifi size={16} className="text-slate-500" />
                      <span className="font-semibold text-slate-700 text-xs">{t('shop.hotspot')}</span>
                    </div>
                  </div>

                  {/* Extra plan info from API */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11px]">
                    {isAutoActivate && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Zap size={12} /> Auto-activate
                      </span>
                    )}
                    {pkg.unusedValidTime > 0 && (
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Clock size={12} /> Valid {pkg.unusedValidTime}d before use
                      </span>
                    )}
                    {coveredCountries > 1 && (
                      <span className="flex items-center gap-1 text-blue-500 font-medium">
                        <Globe size={12} /> {coveredCountries} countries
                      </span>
                    )}
                    {pkg.description && (
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <Shield size={12} /> {pkg.description.length > 40 ? pkg.description.slice(0, 40) + '…' : pkg.description}
                      </span>
                    )}
                  </div>

                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  >
                    {t('shop.choose')} {volumeStr}
                    <ChevronRight size={16} className="opacity-60" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center pb-4">
            <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
              <Globe size={12} /> {t('shop.global_roaming')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- CHECKOUT MODAL: Physical SIM Card Product (from Excel catalog) ---
  if (selectedSimCardProduct && simType === 'PHYSICAL') {
    const shippingCost = 5.99;
    const total = selectedSimCardProduct.sellingPrice + shippingCost;
    return (
      <div className="sm:h-full flex flex-col relative bg-[#F2F4F7]">
        <div className="fixed md:absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-[90%] sm:max-w-sm max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl overflow-y-auto overscroll-contain">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.checkout')}</h2>
              <button onClick={() => setSelectedSimCardProduct(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('shop.selected_plan')}</p>
              <p className="font-bold text-slate-900 text-base mt-1">{selectedSimCardProduct.region}</p>
              <p className="text-sm text-slate-500 font-medium">{selectedSimCardProduct.gbs} GB / {selectedSimCardProduct.validityDays} Days · {selectedSimCardProduct.speed}</p>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                <span className="text-sm text-slate-500">SIM Card</span>
                <span className="text-xl font-bold text-brand-orange">${selectedSimCardProduct.sellingPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-sm text-slate-500">
                <span>Shipping</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-5 bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-3 text-brand-orange">
              <CreditCard size={22} />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('shop.product_type')}</p>
                <p className="font-bold text-sm">{t('shop.physical_sim_card')}</p>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.email_address')}</label>
              <div className="relative">
                <svg className="absolute left-3 top-3 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email"
                  placeholder={t('shop.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.shipping_address')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  placeholder={t('shop.address_placeholder')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                />
              </div>
            </div>
            <button
              onClick={handleCheckoutSimCard}
              disabled={isProcessing || !email.includes('@') || address.length < 5}
              className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <>{t('shop.pay')} ${total.toFixed(2)}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB-VIEW: Country Details & Plans ---
  if (selectedCountry) {
    const discountedPrice = selectedPlan ? selectedPlan.price * 0.5 : 0;
    const shippingCost = simType === 'PHYSICAL' ? 5.99 : 0;
    const total = discountedPrice + shippingCost;

    return (
      <div className="sm:h-full flex flex-col relative bg-[#F2F4F7]">
        {/* Checkout Modal */}
        {selectedPlan && (
          <div className="fixed md:absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
             <div className="bg-white w-full sm:w-[90%] sm:max-w-sm max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl overflow-y-auto overscroll-contain">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.checkout')}</h2>
                    <button onClick={() => setSelectedPlan(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                        <X size={18} />
                    </button>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('shop.selected_plan')}</p>
                        <p className="font-bold text-slate-900 text-base mt-1">{selectedCountry?.name} - {selectedPlan.name}</p>
                        <p className="text-sm text-slate-500 font-medium">{selectedPlan.data} / {selectedPlan.days} Days</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-sm text-slate-300 line-through">${selectedPlan.price.toFixed(2)}</span>
                        <span className="text-xl font-bold text-brand-red">${discountedPrice.toFixed(2)}</span>
                        <span className="text-[11px] font-semibold text-white bg-brand-red px-1.5 py-0.5 rounded-full mt-0.5">50% OFF</span>
                    </div>
                </div>

                <div className="mb-5 bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-3 text-brand-orange">
                     {simType === 'ESIM' ? <Smartphone size={22} /> : <CreditCard size={22} />}
                     <div className="flex-1">
                         <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{t('shop.product_type')}</p>
                         <p className="font-bold text-sm">{simType === 'ESIM' ? t('shop.esim_digital') : t('shop.physical_sim_card')}</p>
                     </div>
                </div>

                <div className="mb-5">
                     <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.email_address')}</label>
                     <div className="relative">
                        <svg className="absolute left-3 top-3 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        <input 
                            type="email"
                            placeholder={t('shop.email_placeholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                        />
                     </div>
                </div>

                {simType === 'PHYSICAL' && (
                    <div className="mb-5">
                         <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.shipping_address')}</label>
                         <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400 pointer-events-none" size={18} />
                            <input 
                                type="text"
                                placeholder={t('shop.address_placeholder')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                autoComplete="street-address"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                            />
                         </div>
                    </div>
                )}

                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing || !email.includes('@') || (simType === 'PHYSICAL' && address.length < 5)}
                    className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600"
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : (
                        <>{t('shop.pay')} ${total.toFixed(2)}</>
                    )}
                </button>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 sticky top-0 z-40">
            <div className="flex items-center">
                <button 
                    onClick={() => setSelectedCountry(null)}
                    className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 text-slate-900 transition-colors"
                >
                    <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
                <h1 className="text-lg font-bold text-slate-900 ml-2 tracking-tight">{selectedCountry.name}</h1>
            </div>
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-brand-orange">
                <Info size={18} />
            </button>
        </div>

        {/* Content */}
        <div className="sm:flex-1 sm:overflow-y-auto no-scrollbar pb-6 px-4 pt-5">
          
          {/* Visual Country Header */}
          <div className="flex items-center gap-4 mb-5">
              <FlagIcon countryCode={selectedCountry.countryCode} size="lg" />
              <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1 border border-emerald-100">
                          <Signal size={10} /> {selectedCountry.networks?.length || 0} {t('shop.networks')}
                      </div>
                      {(selectedCountry.vpn || selectedCountry.vpmn) && (
                        <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-blue-100">
                          VPN{selectedCountry.vpmn ? ` · ${selectedCountry.vpmn}` : ''}
                        </div>
                      )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedCountry.name}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">{selectedCountry.networks?.join(' · ')}</p>
              </div>
          </div>

          <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.select_plan')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-white bg-brand-red px-2 py-0.5 rounded-full">{t('shop.first_order_discount')}</span>
                <span className="text-[11px] font-semibold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">{t('shop.instant_activation')}</span>
              </div>
          </div>
          
          <div className="space-y-3">
            {selectedCountry.plans.map((plan) => (
              <div 
                key={plan.id}
                onClick={() => handlePlanClick(plan)}
                className={`group relative bg-white rounded-xl p-4 border transition-all cursor-pointer ${plan.isBestValue ? 'border-brand-orange/50 shadow-md ring-1 ring-brand-orange/20' : 'border-slate-100 shadow-sm hover:shadow-md'}`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-brand-red text-white text-[11px] font-semibold px-2.5 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide z-10">
                    {t('shop.most_popular')}
                  </div>
                )}
                {plan.isBestValue && (
                  <div className="absolute top-0 right-0 bg-brand-orange text-white text-[11px] font-semibold px-2.5 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide z-10">
                    {t('shop.best_value')}
                  </div>
                )}

                <div className={`flex justify-between items-end mb-3 ${(plan.isPopular || plan.isBestValue) ? 'pt-5' : ''}`}>
                  <div>
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{plan.data.split(' ')[0]}</h3>
                        <span className="text-base font-bold text-slate-400">GB</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="flex flex-col items-end gap-1">
                         <span className="text-sm font-medium text-slate-300 line-through">${plan.price.toFixed(2)}</span>
                         <span className="text-xl font-bold text-brand-red group-hover:text-brand-orange transition-colors leading-none">${(plan.price * 0.5).toFixed(2)}</span>
                         <span className="text-slate-400 text-xs font-medium">{t('shop.usd_first_order')}</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                        <Calendar size={16} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-xs">{plan.days} {t('shop.days')}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                        <Signal size={16} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-xs">5G</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                        <Wifi size={16} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-xs">{t('shop.hotspot')}</span>
                    </div>
                </div>

                <button 
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${plan.isBestValue ? 'bg-brand-orange text-white shadow-md shadow-orange-200' : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'}`}
                >
                  {t('shop.choose')} {plan.data}
                  <ChevronRight size={16} className="opacity-60" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center pb-4">
              <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
                  <Globe size={12} /> {t('shop.global_roaming')}
              </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN VIEW: Shop Home ---
  return (
    <div className="sm:h-full relative bg-[#F2F4F7]">
      <div ref={scrollContainerRef} className="h-full sm:overflow-y-auto no-scrollbar">
        {/* Header - auto-hides on scroll down, reappears on scroll up */}
        <div
          className="bg-white px-4 pt-safe pb-3 sticky top-0 z-40 border-b border-slate-100 transition-transform duration-300 ease-out"
          style={{ transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)' }}
        >
          {/* Row 1: Greeting + action buttons */}
          <div className="flex justify-between items-center mb-3">
              <div>
                  <p className="text-base font-bold text-slate-900 tracking-tight">
                      {t('shop.hello')} {isLoggedIn && user ? user.name : t('shop.new_friend')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Find the perfect plan for your trip</p>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveSims && onSwitchToMySims && (
                  <button onClick={onSwitchToMySims} className="text-[11px] font-semibold text-brand-orange bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full active:scale-95 transition-transform">
                    {simType === 'ESIM' ? t('shop.my_esims') : t('shop.my_sims')}
                  </button>
                )}
                <button onClick={() => onNavigate?.('INBOX')} className="relative w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}>
                  <Bell size={18} className="text-slate-700" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white shadow-sm">
                      {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                <button onClick={() => onNavigate?.('PROFILE')} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6600, #FF8A3D)', WebkitTapHighlightColor: 'transparent' }}>
                  {isLoggedIn && user ? (
                    <span className="text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  ) : (
                    <UserCircle size={20} className="text-white" />
                  )}
                </button>
              </div>
          </div>

          {/* Row 2: Segmented product type toggle */}
          <div className="flex bg-slate-200/80 rounded-xl p-1 mb-2">
            <button
              onClick={() => onSwitchSimType?.('PHYSICAL')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${simType === 'PHYSICAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              SIM Card
            </button>
            <button
              onClick={() => onSwitchSimType?.('ESIM')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${simType === 'ESIM' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              eSIM
            </button>
          </div>
        </div>

        <div className="pb-6 px-4 pt-4">
        
        {/* HERO SECTION: 'Purchase' for eSIM, 'Bind' for Physical */}
        {!searchQuery && (
            <div className="mb-5">
                {simType === 'ESIM' ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-[#CC0000]/15" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #CC0000 100%)' }}>
                        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FFCC33 0%, transparent 70%)' }} />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF6600 0%, transparent 70%)' }} />

                        <div className="relative z-10 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-lg font-extrabold text-white tracking-tight">
                                    Evair<span className="text-[#FFCC33]">SIM</span>
                                </p>
                                <div className="bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full">
                                    <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wider">{t('shop.official_store')}</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight leading-tight">
                                {t('shop.purchase_your_esim')}<br/>
                                <span className="text-[#FFCC33]">{t('shop.your_esim')}</span>
                            </h2>

                            <p className="text-white/70 font-medium text-sm leading-relaxed max-w-[240px]">
                                {t('shop.esim_subtitle')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #FF6600 0%, transparent 70%)' }} />
                        <div className="relative z-10 p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
                                    <CreditCard size={22} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-white tracking-tight">{t('shop.bind_sim')}</h2>
                                    <p className="text-sm text-slate-400 mt-1 leading-snug">Track delivery & activate your physical SIM card</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><Truck size={14} className="text-brand-orange" /> Delivery Tracking</span>
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><Smartphone size={14} className="text-brand-orange" /> SIM Activation</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (!isLoggedIn) { onLoginRequest(); } else { onSwitchToSetup?.(); }
                                }}
                                className="w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)',
                                    color: '#fff',
                                    boxShadow: '0 4px 12px rgba(255,102,0,0.3)',
                                }}
                            >
                                Set Up Now
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* SIM Card products — country header + plan grid */}
        {simType === 'PHYSICAL' && !searchQuery && (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">{t('shop.purchase_sim_cards')}</h3>

              {/* Country header */}
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                  <FlagIcon countryCode="US" size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900 leading-tight">United States</p>
                      <span className="text-[11px] font-semibold text-brand-orange bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 shrink-0">{SIM_CARD_PRODUCTS.length} Plans</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">AT&T · Verizon · T-Mobile · <span className="text-[11px] font-semibold text-slate-600">3G/4G/5G</span></p>
                  </div>
                </div>
              </div>

              {/* Plan cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {SIM_CARD_PRODUCTS.map((product) => {
                  const pricePerGb = product.sellingPrice / product.gbs;
                  const isBestValue = product.id === 'US_10_30';
                  const isReloadable = !product.topUpType.toLowerCase().includes('non-reloadable');
                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        if (!isLoggedIn) onLoginRequest();
                        else setSelectedSimCardProduct(product);
                      }}
                      className={`relative bg-white rounded-xl p-4 text-left transition-all active:scale-[0.97] shadow-sm border ${isBestValue ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      {isBestValue && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          Best Value
                        </div>
                      )}
                      <p className="text-lg font-extrabold text-slate-900 tracking-tight">{product.gbs} <span className="text-sm font-bold text-slate-400">GB</span></p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{product.validityDays} Days</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-brand-orange">${product.sellingPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">${pricePerGb.toFixed(2)}/GB</p>
                      <div className="mt-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isReloadable ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-slate-500 bg-slate-50 border border-slate-200'}`}>
                          {isReloadable ? 'Reloadable' : 'Non-reloadable'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
        )}

        {/* All eSIM Plans from API - eSIM only */}
        {simType === 'ESIM' && (
          <>
            {/* Loading state */}
            {esimLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-brand-orange mb-3" />
                <p className="text-slate-400 text-sm font-medium">{t('shop.loading_plans')}</p>
              </div>
            )}

            {/* Error state */}
            {esimError && !esimLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-slate-500 text-sm mb-3">{t('shop.load_error')}</p>
                <button
                  onClick={loadEsimPackages}
                  className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  <RefreshCw size={16} />
                  {t('shop.retry')}
                </button>
              </div>
            )}

            {!esimLoading && !esimError && (
              <>
                {/* ── Search bar ── */}
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={t('shop.search_placeholder')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 placeholder-slate-400 transition-all"
                  />
                </div>

                {/* ── Popular Destinations ── */}
                {!searchQuery && popularGroups.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight flex items-center gap-2">
                      <Star size={16} className="text-amber-500" />
                      {t('shop.popular_destinations')}
                    </h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                      {popularGroups.map((group) => {
                        const cheapest = group.packages.reduce((min, p) => p.price < min.price ? p : min, group.packages[0]);
                        return (
                          <button
                            key={group.locationCode}
                            onClick={() => setSelectedEsimGroup(group)}
                            className="flex-shrink-0 w-[110px] bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-center"
                          >
                            <div className="flex justify-center mb-2">
                              <FlagIcon countryCode={group.flag} size="md" />
                            </div>
                            <p className="font-semibold text-slate-900 text-sm truncate">{group.locationName}</p>
                            <p className="text-[11px] text-brand-orange font-bold mt-1">
                              {t('shop.from')} ${retailPrice(cheapest.price).toFixed(2)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Browse Mode Toggle: By Country / By Region ── */}
                {!searchQuery && (
                  <div className="flex bg-slate-100/80 rounded-2xl p-1 mb-5 border border-slate-200/60">
                    <button
                      onClick={() => { setBrowseMode('country'); setShowAllCountries(false); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-200 ${
                        browseMode === 'country'
                          ? 'bg-white text-slate-800 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/50'
                          : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      <MapPin size={15} strokeWidth={2.5} />
                      {t('shop.by_country')}
                    </button>
                    <button
                      onClick={() => { setBrowseMode('region'); setShowAllCountries(false); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-200 ${
                        browseMode === 'region'
                          ? 'bg-white text-slate-800 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/50'
                          : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      <Globe size={15} strokeWidth={2.5} />
                      {t('shop.by_region')}
                    </button>
                  </div>
                )}

                {/* ── Continent Filter Tabs (only in country mode) ── */}
                {!searchQuery && browseMode === 'country' && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4 mb-3">
                    {CONTINENT_TABS.filter(tab => tab !== 'Multi-Region').map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setContinentTab(tab); setShowAllCountries(false); }}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-[0.97] ${
                          continentTab === tab
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {tab === 'All' ? t('shop.all_regions')
                          : t(`shop.continent_${tab.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Section title ── */}
                <div className="flex items-baseline gap-2 mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {searchQuery ? t('shop.search_results')
                      : browseMode === 'region' ? t('shop.multi_country_plans')
                      : t('shop.buy_new_esim')}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 tabular-nums">({filteredEsimGroups.length})</span>
                </div>

                {/* ── Unified list ── */}
                {filteredEsimGroups.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">{t('shop.no_results')}</div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden shadow-sm mb-5">
                    {visibleEsimGroups.map((group) => {
                      const cheapestPkg = group.packages.reduce((min, p) => p.price < min.price ? p : min, group.packages[0]);
                      const cheapestPrice = cheapestPkg ? retailPrice(cheapestPkg.price) : 0;
                      const countryCodes = group.locationCode.split(',').map(c => c.trim());
                      const countryCount = countryCodes.length;
                      return (
                        <button
                          key={group.locationCode}
                          onClick={() => setSelectedEsimGroup(group)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {group.isMultiRegion ? (
                              <Globe size={24} className="text-blue-500 flex-shrink-0" />
                            ) : (
                              <FlagIcon countryCode={group.flag} size="md" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{group.locationName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {group.packages.length} {group.packages.length === 1 ? 'Plan' : 'Plans'}
                                {group.isMultiRegion && countryCount > 1 && (
                                  <span className="ml-1.5 text-[11px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                    {countryCount} {t('shop.countries')}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-medium transition-colors whitespace-nowrap ${group.isMultiRegion ? 'text-brand-orange' : 'text-slate-400 group-hover:text-brand-orange'}`}>
                              {t('shop.from')} ${cheapestPrice.toFixed(2)}
                            </span>
                            <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!searchQuery && !showAllCountries && hiddenEsimCount > 0 && (
                  <button
                    onClick={() => setShowAllCountries(true)}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mb-5"
                  >
                    {browseMode === 'region' ? t('shop.view_all_regions') : t('shop.view_all_countries')} ({hiddenEsimCount} {t('shop.more')})
                  </button>
                )}
              </>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default ShopView;