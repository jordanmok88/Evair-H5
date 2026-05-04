import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsRight } from 'lucide-react';
import { getRoute } from '../../utils/routing';
import {
  EVAIR_OPEN_APP_SHELL_CHAT,
  EVAIR_OPEN_MARKETING_CONTACT_EVENT,
} from '../../utils/evairMarketingEvents';
import { useUnreadChat } from '../../hooks/useUnreadChat';

const STORAGE_KEY = 'evair_live_chat_edge_pos';
/** Tab chrome width / height match Tailwind sizing below (rounded side + padding). */
const TAB_W = 44;
const TAB_H = 118;
const DRAG_THRESHOLD_PX = 8;

type EdgePos = { left: number; top: number };

function defaultPos(): EdgePos {
  if (typeof window === 'undefined') return { left: 0, top: 160 };
  const top = Math.max(96, Math.round((window.innerHeight - TAB_H) / 2));
  return { left: 0, top };
}

function loadPos(): EdgePos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EdgePos;
    if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function savePos(pos: EdgePos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function clampPos(pos: EdgePos): EdgePos {
  if (typeof window === 'undefined') return pos;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minL = 0;
  const maxL = Math.max(minL, vw - TAB_W);
  /** Enough headroom below status bar / notch on phones without reading env(). */
  const minT = 12;
  const safeBottom = 12;
  const maxT = Math.max(minT, vh - TAB_H - safeBottom);
  return {
    left: Math.min(Math.max(minL, pos.left), maxL),
    top: Math.min(Math.max(minT, pos.top), maxT),
  };
}

/**
 * Permanent vertical LIVE CHAT tab on the viewport edge — draggable on both axes,
 * persists position in `localStorage`. Opens marketing drawer on public routes
 * (`EVAIR_OPEN_MARKETING_CONTACT_EVENT`) or Dialer tab in `/app`
 * (`EVAIR_OPEN_APP_SHELL_CHAT`).
 *
 * Hidden on `#api-test` only.
 */
const LiveChatEdgeLauncher: React.FC = () => {
  const { t } = useTranslation();
  const [routeKind, setRouteKind] = useState(() => getRoute().kind);
  const [pos, setPos] = useState<EdgePos>(() => clampPos(loadPos() ?? defaultPos()));
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: EdgePos;
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

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openChat = useCallback(() => {
    const k = getRoute().kind;
    if (k === 'apiTest') return;
    if (k === 'app') {
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_APP_SHELL_CHAT));
    } else {
      window.dispatchEvent(new CustomEvent(EVAIR_OPEN_MARKETING_CONTACT_EVENT));
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origin: pos,
      moved: false,
      id: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      d.moved = true;
    }
    if (d.moved) {
      setPos(clampPos({ left: d.origin.left + dx, top: d.origin.top + dy }));
    }
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
    if (d.moved) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const next = clampPos({ left: d.origin.left + dx, top: d.origin.top + dy });
      setPos(next);
      savePos(next);
    } else {
      openChat();
    }
  };

  if (routeKind === 'apiTest') return null;

  const nearLeftEdge = pos.left <= 16;
  const nearRightEdge = typeof window !== 'undefined' && pos.left >= window.innerWidth - TAB_W - 16;
  const roundClass =
    nearLeftEdge && !nearRightEdge
      ? 'rounded-r-xl rounded-l-none'
      : nearRightEdge && !nearLeftEdge
        ? 'rounded-l-xl rounded-r-none'
        : 'rounded-xl';

  const mount = typeof document !== 'undefined' && document.body ? document.body : null;
  if (!mount) return null;

  const label = t('support_fab.live_chat');

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`fixed z-[60] cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing ${roundClass}`}
      style={{
        left: pos.left,
        top: pos.top,
        width: TAB_W,
        minHeight: TAB_H,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openChat();
        }
      }}
    >
      <div
        className={`flex h-full min-h-[7.25rem] w-full flex-col items-center justify-between bg-gradient-to-b from-[#FF6600] to-[#FF8A3D] px-1.5 py-2.5 shadow-lg shadow-orange-900/15 ring-1 ring-white/25 ${roundClass}`}
      >
        <ChevronsRight className="h-4 w-4 shrink-0 text-white opacity-95" aria-hidden strokeWidth={2.5} />
        <span className="flex flex-col items-center gap-0 font-extrabold leading-none text-[9px] uppercase tracking-wide text-white">
          <span>{t('support_fab.edge_tab_line1')}</span>
          <span className="mt-0.5">{t('support_fab.edge_tab_line2')}</span>
        </span>
        {unread > 0 ? (
          <span className="min-w-[1.125rem] rounded-full bg-red-500 px-0.5 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-orange-600">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </div>
    </div>,
    mount,
  );
};

export default LiveChatEdgeLauncher;
