import React, { useState, useEffect } from 'react';
import { SimType, ActiveSim, Tab, User } from '../types';
import ShopView from './ShopView';
import MySimsView from './MySimsView';
import PhysicalSimSetupView from './PhysicalSimSetupView';
interface ProductTabProps {
  type: SimType;
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  onPurchaseComplete: () => void;
  onAddCard?: (iccid: string) => void;
  onDeleteSim?: (simId: string) => void;
  activeSims: ActiveSim[];
  onNavigate: (tab: Tab) => void;
}

const ProductTab: React.FC<ProductTabProps> = ({ 
  type, 
  isLoggedIn, 
  user,
  onLoginRequest, 
  onPurchaseComplete, 
  onAddCard,
  onDeleteSim,
  activeSims,
  onNavigate 
}) => {
  const mySims = activeSims.filter(s => s.type === type);
  
  const [viewMode, setViewMode] = useState<'SHOP' | 'MINE' | 'SETUP'>(mySims.length > 0 ? 'MINE' : 'SHOP');

  useEffect(() => {
    if (viewMode === 'MINE' && mySims.length === 0) {
      setViewMode('SHOP');
    }
  }, [mySims.length, viewMode]);

  return (
    <div className="h-full relative">
       {viewMode === 'SHOP' && (
          <ShopView 
            simType={type}
            isLoggedIn={isLoggedIn}
            user={user}
            onLoginRequest={onLoginRequest}
            onPurchaseComplete={() => {
                onPurchaseComplete();
                setViewMode('MINE');
            }}
            hasActiveSims={mySims.length > 0}
            onSwitchToMySims={() => setViewMode('MINE')}
            onSwitchToSetup={() => setViewMode('SETUP')}
            onAddCard={(iccid) => {
                onAddCard?.(iccid);
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
            onSwitchToSetup={() => setViewMode('SETUP')}
          />
       )}

       {viewMode === 'SETUP' && (
          <PhysicalSimSetupView 
             onSwitchToShop={() => setViewMode('SHOP')}
             onSwitchToList={() => setViewMode('MINE')}
             onAddCard={(iccid) => {
                onAddCard?.(iccid);
                setViewMode('MINE');
             }}
          />
       )}

    </div>
  );
};

export default ProductTab;