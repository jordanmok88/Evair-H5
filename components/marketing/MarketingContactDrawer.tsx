import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ContactUsView from '../../views/ContactUsView';

export interface MarketingContactDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Marketing-site support chat — narrow side panel (thin sheet) on phones; from `md:` up a compact
 * floating card. `ContactUsView` stays `embedded` so the composer stays in-flow.
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

  const mount =
    typeof document !== 'undefined' && document.body ? document.body : null;
  if (!mount) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 animate-in bg-slate-900/35 backdrop-blur-[2px] fade-in duration-200"
        aria-label={t('barcode_scanner.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('support_fab.live_chat')}
        className="fixed top-0 right-0 z-[71] flex h-[100dvh] max-h-[100dvh] w-[min(100%,18rem)] max-w-[288px] animate-in slide-in-from-right fade-in duration-200 flex-col overflow-hidden rounded-none rounded-l-2xl bg-[#eef1f6] shadow-[0_0_48px_-8px_rgba(0,0,0,0.2)] ring-1 ring-black/10 md:inset-auto md:bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+8px))] md:left-auto md:right-5 md:top-auto md:h-[min(40rem,calc(100dvh-6rem))] md:max-h-[min(40rem,calc(100dvh-6rem))] md:w-[min(100%,18rem)] md:max-w-[280px] md:rounded-2xl md:rounded-l-2xl md:shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] md:zoom-in-95 lg:right-8"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none md:rounded-2xl">
          <ContactUsView onBack={onClose} embedded />
        </div>
      </div>
    </div>,
    mount,
  );
};

export default MarketingContactDrawer;
