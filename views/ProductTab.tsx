import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { SimType, ActiveSim, Tab, User, AppNotification, EsimProfileResult } from '../types';
import ShopView from './ShopView';
import MySimsView from './MySimsView';
import PhysicalSimSetupView from './PhysicalSimSetupView';
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
}) => {
  const mySims = activeSims.filter(s => s.type === type);
  
  const [viewMode, setViewMode] = useState<'SHOP' | 'MINE' | 'SETUP'>(() => {
    const saved = sessionStorage.getItem('evair-viewMode');
    if (saved === 'MINE' || saved === 'SHOP') return saved;
    return mySims.length > 0 ? 'MINE' : 'SHOP';
  });
  const [setupEntryPoint, setSetupEntryPoint] = useState<'SHOP' | 'MINE'>('SHOP');

  useEffect(() => {
    sessionStorage.setItem('evair-viewMode', viewMode);
  }, [viewMode]);

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
             onAddCard={async (iccid, profile) => {
                // Do NOT switch viewMode here — we want PhysicalSimSetupView
                // to render its own DONE success screen with the
                // "Go to My SIMs" CTA. Switching to MINE prematurely
                // unmounts the setup view before the success state can
                // show, which was one cause of the post-bind "jumps back
                // to main page" bug.
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