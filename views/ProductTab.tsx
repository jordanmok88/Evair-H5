import React, { useState, useEffect } from 'react';
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
  notifications 
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

  useEffect(() => {
    if (viewMode === 'MINE' && mySims.length === 0) {
      setViewMode('SHOP');
    }
  }, [mySims.length, viewMode]);

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
                await onAddCard?.(iccid, profile);
                setViewMode('MINE');
             }}
             isLoggedIn={isLoggedIn}
             onLoginRequest={onLoginRequest}
          />
       )}

    </div>
  );
};

export default ProductTab;