import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getRoute } from '../../utils/routing';
import {
  EVAIR_APP_CONTACT_OPEN,
  EVAIR_OPEN_APP_SHELL_CHAT,
  EVAIR_OPEN_MARKETING_CONTACT_EVENT,
  type EvairAppContactOpenDetail,
  type MarketingContactOpenDetail,
} from '../../utils/evairMarketingEvents';
import { useUnreadChat } from '../../hooks/useUnreadChat';
import { useViewportMinWidth } from '../../hooks/useViewportMinWidth';

const DOCK_STORAGE_KEY = 'evair_live_chat_dock';
const MD_MIN = 768;
const FLIP_MIN_DX = 44;
const FLIP_DOMINANCE = 1.2;
/** Mobile idle strip */
const COLLAPSED_W_PX = 4;
const EXPAND_MS = 5200;
/** Transitions (width / opacity / shadow) */
const EASE_PREMIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';

function tabSize(mdUp: boolean): { w: number; h: number } {
  return mdUp ? { w: 44, h: 118 } : { w: 28, h: 104 };
}

function loadDock(): 'left' | 'right' {
  try {
    const raw = localStorage.getItem(DOCK_STORAGE_KEY);
    if (raw === '"right"' || raw === 'right') return 'right';
    const j = raw ? JSON.parse(raw) : null;
    if (j?.dock === 'right' || j?.dock === 'left') return j.dock;
    // migrate legacy v2 payload
    const pos = localStorage.getItem('evair_live_chat_edge_pos');
    if (pos) {
      const p = JSON.parse(pos) as { dock?: string };
      if (p?.dock === 'right') return 'right';
    }
  } catch {
    /* noop */
  }
  return 'left';
}

function saveDock(dock: 'left' | 'right') {
  try {
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify({ dock }));
  } catch {
    /* noop */
  }
}

interface LiveChatEdgeLauncherProps {
  /** Marketing contact drawer is open — hide the edge tab completely. */
  marketingDrawerOpen?: boolean;
}

/**
 * Edge “Live chat” control. **Mobile (< md):** collapses to a 4px orange line when idle;
 * scroll/touch peeks the full tab for ~5s with smooth easing. **Desktop:** always expanded.
 * Hidden while any full chat surface is open. Network loss tints the collapsed rail + tooltip.
 */
const LiveChatEdgeLauncher: React.FC<LiveChatEdgeLauncherProps> = ({ marketingDrawerOpen = false }) => {
  const { t } = useTranslation();
  const mdUp = useViewportMinWidth(MD_MIN);
  const { w: TAB_W, h: TAB_H } = tabSize(mdUp);

  const [routeKind, setRouteKind] = useState(() => getRoute().kind);
  const [dock, setDock] = useState<'left' | 'right'>(loadDock);
  const [appContactSurfaceOpen, setAppContactSurfaceOpen] = useState(() =>
    typeof window !== 'undefined'
      ? getRoute().kind === 'app' && window.location.hash.toLowerCase() === '#contact'
      : false,
  );
  /** Mobile-only: user recently interacted — show full-width tab */
  const [mobilePeek, setMobilePeek] = useState(!mdUp);

  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originDock: 'left' | 'right';
    moved: boolean;
    id: number;
  } | null>(null);

  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const unreadActive = routeKind === 'app' && !marketingDrawerOpen && !appContactSurfaceOpen;
  const { unread } = useUnreadChat(unreadActive && routeKind !== 'apiTest');

  const chatSurfacesOpen = marketingDrawerOpen || appContactSurfaceOpen;
  const showExpanded = mdUp || mobilePeek;

  useEffect(() => {
    const syncRoute = () => {
      const r = getRoute();
      setRouteKind(r.kind);
      if (r.kind !== 'app') {
        setAppContactSurfaceOpen(false);
      }
    };
    const syncContactFromLocation = () => {
      const h = window.location.hash.toLowerCase();
      setAppContactSurfaceOpen(getRoute().kind === 'app' && h === '#contact');
    };
    const onAppContactBroadcast = (e: Event) => {
      const d = (e as CustomEvent<EvairAppContactOpenDetail>).detail;
      if (d && typeof d.open === 'boolean') {
        setAppContactSurfaceOpen(d.open);
      }
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncContactFromLocation);
    window.addEventListener('popstate', syncContactFromLocation);
    window.addEventListener(EVAIR_APP_CONTACT_OPEN, onAppContactBroadcast);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncContactFromLocation);
      window.removeEventListener('popstate', syncContactFromLocation);
      window.removeEventListener(EVAIR_APP_CONTACT_OPEN, onAppContactBroadcast);
    };
  }, []);

  /** Desktop always expanded; entering mobile defaults to collapsed line until interaction */
  useEffect(() => {
    if (mdUp) {
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }
      setMobilePeek(true);
      return;
    }
    setMobilePeek(false);
  }, [mdUp]);

  const bumpMobilePeek = useCallback(() => {
    if (mdUp || chatSurfacesOpen) return;
    setMobilePeek(true);
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => {
      setMobilePeek(false);
      peekTimerRef.current = null;
    }, EXPAND_MS);
  }, [mdUp, chatSurfacesOpen]);

  /** Scroll / touch wakes the strip on phones */
  useEffect(() => {
    if (mdUp || chatSurfacesOpen) return undefined;
    const opts = { passive: true } as AddEventListenerOptions;
    const onScroll = () => bumpMobilePeek();
    const onTouch = () => bumpMobilePeek();
    window.addEventListener('scroll', onScroll, opts);
    window.addEventListener('touchstart', onTouch, opts);
    window.addEventListener('wheel', onScroll, opts);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('wheel', onScroll);
    };
  }, [mdUp, chatSurfacesOpen, bumpMobilePeek]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const sync = () => setOnline(navigator.onLine);
    sync();
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const openChat = useCallback(() => {
    const k = getRoute().kind;
    if (k === 'apiTest') return;
    const instantMd = typeof window !== 'undefined' && window.innerWidth >= MD_MIN;
    const { w, h } = tabSize(instantMd);
    /** Vertically centred tab → anchor drawer to same vertical axis */
    const topPx =
      typeof window !== 'undefined' ? Math.max(12, Math.round(window.innerHeight / 2 - h / 2)) : 160;
    if (k === 'app') {
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_APP_SHELL_CHAT));
    } else {
      const detail: MarketingContactOpenDetail = { dock, topPx, tabW: w, tabH: h };
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_MARKETING_CONTACT_EVENT, { detail }));
    }
  }, [dock]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    bumpMobilePeek();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originDock: dock,
      moved: false,
      id: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) d.moved = true;
    // vertical drag does not reposition strip (always centred); only horizontal flip gesture
    void dy;
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (!mdUp ? showExpanded : true)) {
      openChat();
      return;
    }
    if (!showExpanded) return;

    const flip =
      Math.abs(dx) > FLIP_MIN_DX && Math.abs(dx) > Math.abs(dy) * FLIP_DOMINANCE;
    if (flip) {
      let next = d.originDock;
      if (d.originDock === 'left' && dx > 0) next = 'right';
      else if (d.originDock === 'right' && dx < 0) next = 'left';
      setDock(next);
      saveDock(next);
    }
  };

  if (routeKind === 'apiTest') return null;
  if (chatSurfacesOpen) return null;

  const railW = !mdUp && !showExpanded ? COLLAPSED_W_PX : TAB_W;
  const roundClass =
    dock === 'left' ? 'rounded-r-xl rounded-l-none' : 'rounded-l-xl rounded-r-none';
  const collapsedVisual = !mdUp && !showExpanded;
  const Chevrons = dock === 'left' ? ChevronsRight : ChevronsLeft;

  const mount = typeof document !== 'undefined' && document.body ? document.body : null;
  if (!mount) return null;

  const label = t('support_fab.live_chat');
  const reconnectLabel = t('contact.live_chat_reconnecting_tooltip');

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label={collapsedVisual && !online ? reconnectLabel : label}
      title={collapsedVisual && !online ? reconnectLabel : undefined}
      className={`fixed z-[60] touch-none select-none overflow-hidden outline-none active:outline-none ${roundClass}`}
      style={{
        ...(dock === 'left' ? { left: 0 } : { right: 0 }),
        top: '50%',
        transform: 'translateY(-50%)',
        width: railW,
        minHeight: collapsedVisual ? `min(${TAB_H}px, 45vh)` : TAB_H,
        height: collapsedVisual ? `min(280px, 45vh)` : 'auto',
        transition: `width 420ms ${EASE_PREMIUM}, box-shadow 360ms ${EASE_PREMIUM}, min-height 360ms ${EASE_PREMIUM}, filter 380ms ease, opacity 320ms ease`,
        cursor: 'pointer',
        boxShadow: collapsedVisual ? '0 4px 20px rgba(255,102,0,0.08)' : '0 10px 32px rgba(255,102,0,0.18)',
        filter: collapsedVisual && !online ? 'saturate(0.55) hue-rotate(-12deg)' : 'none',
        animation:
          collapsedVisual && !online ? 'livechat-rail-offline-pulse 1.8s ease-in-out infinite' : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onKeyDown={(keyEv) => {
        if (keyEv.key === 'Enter' || keyEv.key === ' ') {
          keyEv.preventDefault();
          bumpMobilePeek();
          openChat();
        }
      }}
    >
      <div
        className={`flex h-full min-h-[inherit] w-full flex-col items-center justify-between bg-gradient-to-b from-[#FF6600] to-[#FF8A3D] opacity-100 ring-1 ring-black/[0.04] md:justify-between md:gap-0 ${roundClass} ${collapsedVisual ? '' : mdUp ? 'px-1.5 py-2.5' : 'px-0.5 py-1.5'}`}
        style={{
          opacity: collapsedVisual ? 0.94 : 1,
          justifyContent: collapsedVisual ? 'center' : undefined,
          transition: `opacity 320ms ${EASE_PREMIUM}`,
        }}
      >
        <div
          className={`flex h-full min-h-[inherit] w-full flex-col items-center justify-between ${collapsedVisual ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          style={{ transition: `opacity 280ms ${EASE_PREMIUM}` }}
          aria-hidden={collapsedVisual}
        >
          <Chevrons
            className={`shrink-0 text-white opacity-95 ${mdUp ? 'h-4 w-4' : 'h-3 w-3'}`}
            aria-hidden
            strokeWidth={2.5}
          />
          <span
            className={`flex flex-col items-center font-extrabold uppercase text-white [writing-mode:vertical-rl] [text-orientation:upright] rotate-180 ${mdUp ? 'text-[11px]' : 'text-[10px]'}`}
            style={{
              letterSpacing: mdUp ? '0.06em' : '0.1em',
              lineHeight: 1.55,
            }}
          >
            {t('support_fab.live_chat')}
          </span>
          {unread > 0 ? (
            <span
              className={`rounded-full bg-red-500 text-center font-bold text-white ring-2 ring-orange-600 ${mdUp ? 'min-w-[1.125rem] px-0.5 text-[9px] leading-4 [writing-mode:horizontal-tb]' : 'min-w-3 px-px text-[7px] leading-3 [writing-mode:horizontal-tb]'}`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : (
            <span className={`${mdUp ? 'h-4 w-4' : 'h-3 w-3'} shrink-0`} aria-hidden />
          )}
        </div>
      </div>
    </div>,
    mount,
  );
};

export default LiveChatEdgeLauncher;
