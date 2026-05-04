import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getRoute } from '../../utils/routing';
import {
  EVAIR_OPEN_APP_SHELL_CHAT,
  EVAIR_OPEN_MARKETING_CONTACT_EVENT,
  type MarketingContactOpenDetail,
} from '../../utils/evairMarketingEvents';
import { useUnreadChat } from '../../hooks/useUnreadChat';
import { useViewportMinWidth } from '../../hooks/useViewportMinWidth';

const STORAGE_KEY = 'evair_live_chat_edge_pos';
const MD_MIN = 768;
const DRAG_THRESHOLD_PX = 8;
/** Horizontal swipe must beat vertical intent to flip which screen edge the tab sticks to. */
const FLIP_MIN_DX = 44;
const FLIP_DOMINANCE = 1.2;

function tabSize(mdUp: boolean): { w: number; h: number } {
  // Mobile: ~50% narrower than desktop strip (readability + UX request).
  return mdUp ? { w: 44, h: 118 } : { w: 22, h: 92 };
}

type PersistV2 = { v: 2; dock: 'left' | 'right'; top: number };
type PersistV1 = { left: number; top: number };

function clampTop(top: number, tabH: number, vh: number): number {
  const minT = 12;
  const maxT = Math.max(minT, vh - tabH - 12);
  return Math.min(Math.max(minT, top), maxT);
}

function loadState(vh: number, vw: number, tabH: number): { dock: 'left' | 'right'; top: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { dock: 'left', top: clampTop(Math.max(96, Math.round((vh - tabH) / 2)), tabH, vh) };
    }
    const p = JSON.parse(raw) as PersistV2 | PersistV1;
    if ((p as PersistV2).v === 2 && (p as PersistV2).dock && typeof (p as PersistV2).top === 'number') {
      const { dock, top } = p as PersistV2;
      return { dock, top: clampTop(top, tabH, vh) };
    }
    const { left, top } = p as PersistV1;
    if (typeof left === 'number' && typeof top === 'number') {
      const w = tabSize(vw >= MD_MIN).w;
      const dock: 'left' | 'right' = left + w / 2 <= vw / 2 ? 'left' : 'right';
      return { dock, top: clampTop(top, tabH, vh) };
    }
  } catch {
    /* ignore */
  }
  return { dock: 'left', top: clampTop(Math.max(96, Math.round((vh - tabH) / 2)), tabH, vh) };
}

function saveState(dock: 'left' | 'right', top: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, dock, top } satisfies PersistV2));
  } catch {
    /* ignore */
  }
}

/**
 * Vertical strip on the **left or right viewport edge only** (never floating mid-screen).
 * Drag adjusts **vertical** position; a clear horizontal swipe flips the edge. Opens marketing
 * drawer with anchor metadata, or `/app` contact tab.
 */
const LiveChatEdgeLauncher: React.FC = () => {
  const { t } = useTranslation();
  const mdUp = useViewportMinWidth(MD_MIN);
  const { w: TAB_W, h: TAB_H } = tabSize(mdUp);

  const [routeKind, setRouteKind] = useState(() => getRoute().kind);
  const [{ dock, top }, setEdge] = useState<{ dock: 'left' | 'right'; top: number }>(() => {
    if (typeof window === 'undefined') return { dock: 'left', top: 160 };
    return loadState(window.innerHeight, window.innerWidth, tabSize(window.innerWidth >= MD_MIN).h);
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originTop: number;
    originDock: 'left' | 'right';
    moved: boolean;
    id: number;
  } | null>(null);

  useEffect(() => {
    const sync = () => setRouteKind(getRoute().kind);
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const unreadActive = routeKind === 'app';
  const { unread } = useUnreadChat(unreadActive);

  /** Breakpoint / rotation: reclamp top to new tab height and viewport. */
  useEffect(() => {
    const vh = window.innerHeight;
    const { h } = tabSize(mdUp);
    setEdge((e) => ({ ...e, top: clampTop(e.top, h, vh) }));
  }, [mdUp]);

  useEffect(() => {
    const onResize = () => {
      const vh = window.innerHeight;
      const { h } = tabSize(window.innerWidth >= MD_MIN);
      setEdge((e) => ({ ...e, top: clampTop(e.top, h, vh) }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openChat = useCallback(() => {
    const k = getRoute().kind;
    if (k === 'apiTest') return;
    const instantMd = typeof window !== 'undefined' && window.innerWidth >= MD_MIN;
    const { w, h } = tabSize(instantMd);
    if (k === 'app') {
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_APP_SHELL_CHAT));
    } else {
      const detail: MarketingContactOpenDetail = { dock, topPx: top, tabW: w, tabH: h };
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_MARKETING_CONTACT_EVENT, { detail }));
    }
  }, [dock, top]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originTop: top,
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
    if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      d.moved = true;
    }
    if (!d.moved) return;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const nextTop = clampTop(d.originTop + dy, TAB_H, vh);
    setEdge((prev) => ({ ...prev, top: nextTop }));
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (!d.moved) {
      openChat();
      return;
    }

    const vh = window.innerHeight;
    const flip =
      Math.abs(dx) > FLIP_MIN_DX && Math.abs(dx) > Math.abs(dy) * FLIP_DOMINANCE;

    if (flip) {
      let nextDock = d.originDock;
      if (d.originDock === 'left' && dx > 0) nextDock = 'right';
      else if (d.originDock === 'right' && dx < 0) nextDock = 'left';
      const nextTop = clampTop(d.originTop + dy, TAB_H, vh);
      setEdge({ dock: nextDock, top: nextTop });
      saveState(nextDock, nextTop);
    } else {
      const nextTop = clampTop(d.originTop + dy, TAB_H, vh);
      setEdge((prev) => ({ ...prev, top: nextTop }));
      saveState(d.originDock, nextTop);
    }
  };

  if (routeKind === 'apiTest') return null;

  const roundClass =
    dock === 'left' ? 'rounded-r-xl rounded-l-none' : 'rounded-l-xl rounded-r-none';

  const mount = typeof document !== 'undefined' && document.body ? document.body : null;
  if (!mount) return null;

  const label = t('support_fab.live_chat');
  const Chevrons = dock === 'left' ? ChevronsRight : ChevronsLeft;

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`fixed z-[60] cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing ${roundClass}`}
      style={{
        ...(dock === 'left' ? { left: 0 } : { right: 0 }),
        top,
        width: TAB_W,
        minHeight: TAB_H,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onKeyDown={(keyEv) => {
        if (keyEv.key === 'Enter' || keyEv.key === ' ') {
          keyEv.preventDefault();
          openChat();
        }
      }}
    >
      <div
        className={`flex h-full min-h-[5.75rem] w-full flex-col items-center justify-between bg-gradient-to-b from-[#FF6600] to-[#FF8A3D] shadow-lg shadow-orange-900/15 ring-1 ring-white/25 md:min-h-[7.25rem] ${roundClass} ${mdUp ? 'px-1.5 py-2.5' : 'px-0.5 py-1.5'}`}
      >
        <Chevrons
          className={`shrink-0 text-white opacity-95 ${mdUp ? 'h-4 w-4' : 'h-3 w-3'}`}
          aria-hidden
          strokeWidth={2.5}
        />
        <span
          className={`flex flex-col items-center gap-0 font-extrabold uppercase tracking-wide text-white ${mdUp ? 'text-[9px] leading-none' : 'text-[7px] leading-[0.95]'}`}
        >
          <span>{t('support_fab.edge_tab_line1')}</span>
          <span className={mdUp ? 'mt-0.5' : 'mt-px'}>{t('support_fab.edge_tab_line2')}</span>
        </span>
        {unread > 0 ? (
          <span
            className={`rounded-full bg-red-500 text-center font-bold text-white ring-2 ring-orange-600 ${mdUp ? 'min-w-[1.125rem] px-0.5 text-[9px] leading-4' : 'min-w-3 px-px text-[7px] leading-3'}`}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : (
          <span className={`shrink-0 ${mdUp ? 'h-4 w-4' : 'h-3 w-3'}`} aria-hidden />
        )}
      </div>
    </div>,
    mount,
  );
};

export default LiveChatEdgeLauncher;
