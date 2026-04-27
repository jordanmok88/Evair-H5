import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { SimType, ActiveSim, Tab, User, AppNotification, EsimProfileResult } from '../types';
import ShopView from './ShopView';
import MySimsView from './MySimsView';
import PhysicalSimSetupView from './PhysicalSimSetupView';
import { ActivationPreviewData } from '../services/api/activation';

const VIEW_MODE_KEY_PHYSICAL = 'evair-viewMode-physical';
const VIEW_MODE_KEY_ESIM = 'evair-viewMode-esim';

/** Read persisted tab view; eSIM ignores legacy `SETUP` (physical bind wizard). */
function readStoredViewMode(simType: SimType): string | null {
  const key = simType === 'PHYSICAL' ? VIEW_MODE_KEY_PHYSICAL : VIEW_MODE_KEY_ESIM;
  const v = sessionStorage.getItem(key);
  if (v) return v;
  const legacy = sessionStorage.getItem('evair-viewMode');
  if (!legacy) return null;
  if (simType === 'ESIM') {
    return legacy === 'SHOP' || legacy === 'MINE' ? legacy : null;
  }
  return legacy === 'SHOP' || legacy === 'MINE' || legacy === 'SETUP' ? legacy : null;
}

interface ProductTabProps {
  type: SimType;
  testMode?: boolean;
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  onPurchaseComplete: (purchaseInfo?: { planName?: string; countryCode?: string; type?: SimType; orderNo?: string; iccid?: string }) => void;
  onAddCard?: (iccid: string, profile?: EsimProfileResult, activationCode?: string) => Promise<void>;
  onDeleteSim?: (simId: string) => void;
  onUpdateSim?: (simId: string, updates: Partial<ActiveSim>) => void;
  activeSims: ActiveSim[];
  onNavigate: (tab: Tab) => void;
  onSwitchSimType?: (type: SimType) => void;
  notifications?: AppNotification[];
  /** From `/app/travel-esim/{iso2}` — opens that country in the eSIM shop once. */
  initialEsimLocationCode?: string | null;
  /** Called after the deep-link country is applied (or load finished with no match). */
  onInitialEsimDeepLinkConsumed?: () => void;
  /** `/app#bind-sim` — open Add SIM / bind wizard once (marketing "Activate my SIM"). */
  initialBindSimDeepLink?: boolean;
  onBindSimDeepLinkConsumed?: () => void;
}

const ProductTab: React.FC<ProductTabProps> = ({
  type,
  testMode = false,
  isLoggedIn,
  user,
  onLoginRequest,
  onPurchaseComplete,
  onAddCard,
  onDeleteSim,
  onUpdateSim,
  activeSims,
  onNavigate,
  onSwitchSimType,
  notifications,
  initialEsimLocationCode = null,
  onInitialEsimDeepLinkConsumed,
  initialBindSimDeepLink = false,
  onBindSimDeepLinkConsumed,
}) => {
  const mySims = activeSims.filter(s => s.type === type);
  const bindDeepLinkConsumedRef = useRef(false);

  const viewModeStorageKey = type === 'PHYSICAL' ? VIEW_MODE_KEY_PHYSICAL : VIEW_MODE_KEY_ESIM;

  const [viewMode, setViewMode] = useState<'SHOP' | 'MINE' | 'SETUP'>(() => {
    if (initialBindSimDeepLink && type === 'PHYSICAL') return 'SETUP';
    const saved = readStoredViewMode(type);
    if (saved === 'MINE' || saved === 'SHOP') return saved;
    // Physical SETUP only when explicitly binding — not when "Buy SIM" (#sim-card).
    if (type === 'PHYSICAL' && saved === 'SETUP') {
      const hash =
        typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
      if (hash === '#bind-sim' || initialBindSimDeepLink) return 'SETUP';
      if (hash === '#sim-card') return 'SHOP';
      return mySims.length > 0 ? 'MINE' : 'SHOP';
    }
    return mySims.length > 0 ? 'MINE' : 'SHOP';
  });
  const [setupEntryPoint, setSetupEntryPoint] = useState<'SHOP' | 'MINE'>('SHOP');

  const consumeBindDeepLink = useCallback(() => {
    onBindSimDeepLinkConsumed?.();
  }, [onBindSimDeepLinkConsumed]);

  useLayoutEffect(() => {
    if (!initialBindSimDeepLink || type !== 'PHYSICAL') {
      if (!initialBindSimDeepLink) bindDeepLinkConsumedRef.current = false;
      return;
    }
    if (bindDeepLinkConsumedRef.current) return;
    bindDeepLinkConsumedRef.current = true;
    setSetupEntryPoint('SHOP');
    setViewMode('SETUP');
    consumeBindDeepLink();
  }, [initialBindSimDeepLink, type, consumeBindDeepLink]);

  useEffect(() => {
    sessionStorage.setItem(viewModeStorageKey, viewMode);
  }, [viewMode, viewModeStorageKey]);

  // `/app/travel-esim/jp` must land in the eSIM shop, not "My SIMs"
  // (sessionStorage can restore viewMode === 'MINE' from a prior visit).
  useLayoutEffect(() => {
    if (initialEsimLocationCode) {
      setViewMode('SHOP');
    }
  }, [initialEsimLocationCode]);

  // Callers used to pass `(tab, trackingNumber)` to open the setup
  // flow on the TRACKING tab. After the 2026-04 FBA pivot the tracking
  // tab is gone — we accept and ignore those args so existing callers
  // still compile. Can be simplified to a zero-arg function once all
  // callers are cleaned up.
  const handleSwitchToSetup = (..._args: unknown[]) => {
    void _args;
    setSetupEntryPoint(viewMode === 'MINE' ? 'MINE' : 'SHOP');
    setViewMode('SETUP');
  };

  // Auto-pick the initial view on FIRST mount only:
  //   - If the user already owns SIMs of this type -> land on MINE.
  //   - Otherwise land on SHOP (default from useState init above).
  // We intentionally do NOT reactively bounce the user back to SHOP if
  // `mySims` becomes empty later (e.g. during a post-bind re-fetch race),
  // because that was the cause of the "jumps back to main page after
  // binding" bug. An empty MY SIMs page renders a proper empty state.
  const didInitModeRef = useRef(false);
  useEffect(() => {
    if (didInitModeRef.current) return;
    didInitModeRef.current = true;
  }, []);

  return (
    <div className="lg:h-full relative">
       {viewMode === 'SHOP' && (
          <ShopView
            simType={type}
            testMode={testMode}
            isLoggedIn={isLoggedIn}
            user={user}
            onLoginRequest={onLoginRequest}
            onPurchaseComplete={(info) => {
                onPurchaseComplete(info);
                setViewMode('MINE');
            }}
            hasActiveSims={mySims.length > 0}
            activeSims={activeSims}
            onSwitchToMySims={() => setViewMode('MINE')}
            onSwitchToSetup={() => handleSwitchToSetup()}
            onAddCard={async (iccid) => {
                await onAddCard?.(iccid);
                setViewMode('MINE');
            }}
            onNavigate={(tab) => onNavigate(tab as Tab)}
            onSwitchSimType={onSwitchSimType}
            notifications={notifications}
            initialEsimLocationCode={initialEsimLocationCode}
            onInitialEsimDeepLinkConsumed={onInitialEsimDeepLinkConsumed}
          />
       )}
       
       {viewMode === 'MINE' && (
          <MySimsView 
            activeSims={activeSims}
            filterType={type}
            onNavigate={onNavigate}
            onSwitchToShop={() => setViewMode('SHOP')}
            onDeleteSim={onDeleteSim}
            onSwitchToSetup={handleSwitchToSetup}
            onUpdateSim={onUpdateSim}
          />
       )}

       {viewMode === 'SETUP' && (
          <PhysicalSimSetupView
             onSwitchToShop={() => setViewMode(setupEntryPoint)}
             onSwitchToList={() => setViewMode('MINE')}
             onAddCard={async (iccid, previewData) => {
                // Do NOT switch viewMode here — we want PhysicalSimSetupView
                // to render its own DONE success screen with the
                // "Go to My SIMs" CTA. Switching to MINE prematurely
                // unmounts the setup view before the success state can
                // show, which was one cause of the post-bind "jumps back
                // to main page" bug.
                const profile: EsimProfileResult | undefined = previewData ? {
                  iccid: previewData.iccid,
                  packageCode: '',
                  packageName: previewData.package?.name || '',
                  status: 'ENABLED',
                  smdpStatus: 'ENABLED',
                  expiredTime: '',
                  totalVolume: (previewData.package?.volumeGb ?? 0) * 1024 * 1024 * 1024,
                  usedVolume: 0,
                  totalDuration: previewData.package?.durationDays ?? 0,
                } : undefined;
                await onAddCard?.(iccid, profile);
             }}
             isLoggedIn={isLoggedIn}
             onLoginRequest={onLoginRequest}
          />
       )}

    </div>
  );
};

export default ProductTab;