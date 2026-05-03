import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ContactUsView from '../../views/ContactUsView';

export interface MarketingContactDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Marketing-site support chat — compact floating panel (bottom corner), not full-height takeover.
 * `ContactUsView` must use `embedded` so its composer stays inside this box (`position` in-flow vs viewport-fixed).
 */
const MarketingContactDrawer: React.FC<MarketingContactDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] animate-in fade-in duration-200"
        aria-label={t('barcode_scanner.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('support_fab.live_chat')}
        className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+8px))] left-4 right-4 z-[71] mx-auto flex h-[min(36rem,calc(100dvh-9rem))] w-full max-w-[392px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200 sm:left-auto sm:right-5 sm:mx-0 md:right-8"
      >
        <ContactUsView onBack={onClose} embedded />
      </div>
    </div>
  );
};

export default MarketingContactDrawer;
