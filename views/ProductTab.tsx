import React, { useState, useEffect } from 'react';
import { SimType, ActiveSim, Tab, User, AppNotification, EsimProfileResult, EsimPackage } from '../types';
import ShopView from './ShopView';
import MySimsView from './MySimsView';
import PhysicalSimSetupView from './PhysicalSimSetupView';

interface ProductTabProps {
  type: SimType;
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

  // 充值流程：首页点击套餐时预选的套餐
  const [pendingTopUpPackage, setPendingTopUpPackage] = useState<EsimPackage | null>(null);

  useEffect(() => {
    sessionStorage.setItem('evair-viewMode', viewMode);
  }, [viewMode]);

  // 充值完成后清除预选套餐
  const handleTopUpComplete = () => {
    setPendingTopUpPackage(null);
  };

  const handleSwitchToSetup = () => {
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
          isLoggedIn={isLoggedIn}
          user={user}
          onLoginRequest={onLoginRequest}
          onSwitchToMySims={() => setViewMode('MINE')}
          hasActiveSims={mySims.length > 0}
          activeSims={activeSims}
          onSwitchToSetup={() => handleSwitchToSetup()}
          onNavigate={(tab) => onNavigate(tab as Tab)}
          notifications={notifications}
          onSelectTopUpPackage={(pkg) => {
            setPendingTopUpPackage(pkg);
            setViewMode('MINE');
          }}
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
          pendingTopUpPackage={pendingTopUpPackage}
          onTopUpComplete={handleTopUpComplete}
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
