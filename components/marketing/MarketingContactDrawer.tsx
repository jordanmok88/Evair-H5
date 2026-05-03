import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ContactUsView from '../../views/ContactUsView';

export interface MarketingContactDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-over support chat for marketing / public routes (no full `/app` navigation).
 * Mirrors the panel-from-right pattern in `DesktopEsimCheckoutDrawer`.
 */
const MarketingContactDrawer: React.FC<MarketingContactDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        aria-label={t('barcode_scanner.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('support_fab.live_chat')}
        className="relative z-[71] flex h-[100dvh] w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300 sm:max-w-[440px] sm:rounded-l-2xl sm:ring-1 sm:ring-black/5"
      >
        <ContactUsView onBack={onClose} embedded />
      </div>
    </div>
  );
};

export default MarketingContactDrawer;
