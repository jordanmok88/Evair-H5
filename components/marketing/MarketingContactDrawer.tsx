import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ContactUsView from '../../views/ContactUsView';
import type { MarketingContactOpenDetail } from '../../utils/evairMarketingEvents';
import { useViewportMinWidth } from '../../hooks/useViewportMinWidth';

const MD_PX = 768;
/** Desktop reading width beside the edge tab (`md+` only). */
const DESKTOP_CHAT_W = 420;
const EDGE_GAP_PX = 10;

export interface MarketingContactDrawerProps {
  open: boolean;
  onClose: () => void;
  /** From `LiveChatEdgeLauncher` / custom event; if missing while open, a centered-right default is used. */
  anchor: MarketingContactOpenDetail | null;
}

function fallbackAnchor(): MarketingContactOpenDetail {
  if (typeof window === 'undefined') {
    return { dock: 'right', topPx: 120, tabW: 42, tabH: 124 };
  }
  const md = window.innerWidth >= MD_PX;
  const tabW = md ? 42 : 32;
  const tabH = md ? 124 : 114;
  const vh = window.innerHeight;
  return {
    dock: 'right',
    topPx: Math.max(12, Math.round((vh - tabH) / 2)),
    tabW,
    tabH,
  };
}

/**
 * Marketing support chat — **full screen on phones** for readability; on `md+` a wide card
 * **anchored beside** the draggable edge tab (left or right).
 */
const MarketingContactDrawer: React.FC<MarketingContactDrawerProps> = ({ open, onClose, anchor }) => {
  const { t } = useTranslation();
  const mdUp = useViewportMinWidth(MD_PX);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const desktopLayout = useMemo(() => {
    if (typeof window === 'undefined' || !mdUp || !open) return null;
    const a = anchor ?? fallbackAnchor();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxPanelH = Math.min(42 * 16, vh - 24);
    const topPx = Math.max(8, Math.min(a.topPx, vh - maxPanelH - 8));
    const panelWidth = Math.min(DESKTOP_CHAT_W, Math.max(320, vw - a.tabW - EDGE_GAP_PX - 24));
    return {
      dock: a.dock,
      topPx,
      panelWidth,
      maxPanelHpx: maxPanelH,
      tabW: a.tabW,
    };
  }, [mdUp, open, anchor?.dock, anchor?.topPx, anchor?.tabW, anchor?.tabH]);

  if (!open) return null;

  const mount = typeof document !== 'undefined' && document.body ? document.body : null;
  if (!mount) return null;

  const slideFrom =
    mdUp && desktopLayout?.dock === 'left' ? 'slide-in-from-left' : 'slide-in-from-right';

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 animate-in bg-slate-900/35 backdrop-blur-[2px] fade-in duration-200"
        aria-label={t('barcode_scanner.close')}
        onClick={onClose}
      />
      {/* Mobile: full viewport sheet — easiest to read. Desktop: anchored wide card beside tab. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('support_fab.live_chat')}
        className={
          mdUp && desktopLayout
            ? `fixed z-[71] flex flex-col overflow-hidden rounded-2xl bg-[#eef1f6] shadow-[0_8px_48px_-8px_rgba(0,0,0,0.22)] ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200 ${slideFrom}`
            : 'fixed inset-0 z-[71] flex h-[100dvh] max-h-[100dvh] w-full animate-in fade-in duration-200 flex-col overflow-hidden bg-[#eef1f6]'
        }
        style={
          mdUp && desktopLayout
            ? {
                top: desktopLayout.topPx,
                ...(desktopLayout.dock === 'left'
                  ? { left: desktopLayout.tabW + EDGE_GAP_PX }
                  : { right: desktopLayout.tabW + EDGE_GAP_PX }),
                width: desktopLayout.panelWidth,
                height: desktopLayout.maxPanelHpx,
                maxHeight: desktopLayout.maxPanelHpx,
              }
            : undefined
        }
      >
        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${mdUp ? 'rounded-2xl' : ''}`}>
          <ContactUsView onBack={onClose} embedded />
        </div>
      </div>
    </div>,
    mount,
  );
};

export default MarketingContactDrawer;
