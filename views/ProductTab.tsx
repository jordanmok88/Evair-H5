import React, { useState, useEffect } from 'react';
import { SimType, ActiveSim, Tab, User, AppNotification, EsimProfileResult } from '../types';
import ShopView from './ShopView';
import MySimsView from './MySimsView';
import PhysicalSimSetupView from './PhysicalSimSetupView';
interface ProductTabProps {
  type: SimType;
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  onPurchaseComplete: (purchaseInfo?: { planName?: string; countryCode?: string; type?: SimType; orderNo?: string; iccid?: string }) => void;
  onAddCard?: (iccid: string, profile?: EsimProfileResult) => void;
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
  
  const [viewMode, setViewMode] = useState<'SHOP' | 'MINE' | 'SETUP'>(mySims.length > 0 ? 'MINE' : 'SHOP');
  const [setupTab, setSetupTab] = useState<'TRACKING' | 'ACTIVATE' | undefined>();
  const [setupTrackingNumber, setSetupTrackingNumber] = useState<string | undefined>();
  const [setupEntryPoint, setSetupEntryPoint] = useState<'SHOP' | 'MINE'>('SHOP');

  const handleSwitchToSetup = (tab?: 'TRACKING' | 'ACTIVATE', trackingNumber?: string) => {
    setSetupTab(tab);
    setSetupTrackingNumber(trackingNumber);
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
            onPurchaseComplete={(info) => {
                onPurchaseComplete(info);
                setViewMode('MINE');
            }}
            hasActiveSims={mySims.length > 0}
            activeSims={activeSims}
            onSwitchToMySims={() => setViewMode('MINE')}
            onSwitchToSetup={() => handleSwitchToSetup()}
            onAddCard={(iccid) => {
                onAddCard?.(iccid);
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
             onAddCard={(iccid, profile) => {
                onAddCard?.(iccid, profile);
                setViewMode('MINE');
             }}
             initialTab={setupTab}
             trackingNumber={setupTrackingNumber}
          />
       )}

    </div>
  );
};

export default ProductTab;