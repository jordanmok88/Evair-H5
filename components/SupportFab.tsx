/**
 * 浮动客服入口（Floating Action Button）
 *
 * - `layout="inset"`: 与 CustomerApp 手机框内 `position: absolute`（默认）
 * - `layout="fixed"`: 全站营销/落地页用 `position: fixed`
 * - 可拖移；可收到贴边、空闲自动收边；用户主动收边时写入 localStorage
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronsLeft, ChevronsRight, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUnreadChat } from '../hooks/useUnreadChat';

interface SupportFabProps {
  visible: boolean;
  onClick: () => void;
  layout?: 'inset' | 'fixed';
  /** 空闲多少毫秒后自动收到边缘；0 关闭 */
  idleHideMs?: number;
}

const STORAGE_KEY_POS = 'evair_support_fab_pos_v1';
const STORAGE_KEY_DOCK = 'evair_support_fab_docked_v1';

const FAB_SIZE = 56;
const STRIP_W = 22;
const DEFAULT_IDLE_MS = 12_000;

type Pos = { left: number; bottom: number };

function loadPos(): Pos | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POS);
    if (!raw) return null;
    const j = JSON.parse(raw) as { left?: unknown; bottom?: unknown };
    if (typeof j.left === 'number' && typeof j.bottom === 'number') {
      return { left: j.left, bottom: j.bottom };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function savePos(p: Pos) {
  try {
    localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function clampInset(left: number, bottom: number, parent: HTMLElement): Pos {
  const pad = 8;
  const pw = parent.clientWidth;
  const ph = parent.clientHeight;
  const minB = 36;
  return {
    left: Math.min(Math.max(pad, left), Math.max(pad, pw - FAB_SIZE - pad)),
    bottom: Math.min(Math.max(minB, bottom), Math.max(minB, ph - FAB_SIZE - pad)),
  };
}

function clampFixed(left: number, bottom: number): Pos {
  if (typeof window === 'undefined') return { left, bottom };
  const pad = 8;
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;
  const minB = 64;
  return {
    left: Math.min(Math.max(pad, left), Math.max(pad, w - FAB_SIZE - pad)),
    bottom: Math.min(Math.max(minB, bottom), Math.max(minB, h - FAB_SIZE - pad)),
  };
}

const SupportFab: React.FC<SupportFabProps> = ({ visible, onClick, layout = 'inset', idleHideMs = DEFAULT_IDLE_MS }) => {
  const { t } = useTranslation();
  const { unread } = useUnreadChat(visible);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Pos>(() => loadPos() ?? { left: 16, bottom: 100 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const [docked, setDocked] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_DOCK) === '1',
  );
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startL: number;
    startB: number;
    moved: boolean;
  } | null>(null);
  const skipNextClick = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onDock = useCallback((persist: boolean) => {
    setDocked(true);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY_DOCK, '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const onUndock = useCallback(() => {
    setDocked(false);
    try {
      localStorage.setItem(STORAGE_KEY_DOCK, '0');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!visible || !idleHideMs) return;
    if (docked) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => onDock(false), idleHideMs);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [visible, idleHideMs, docked, onDock]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('[data-tuck]')) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startL: posRef.current.left,
        startB: posRef.current.bottom,
        moved: false,
      };
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragState.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = d.startY - e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      if (layout === 'fixed') {
        setPos(clampFixed(d.startL + dx, d.startB + dy));
        return;
      }
      const parent = hostRef.current?.offsetParent as HTMLElement | null;
      if (!parent) return;
      setPos(clampInset(d.startL + dx, d.startB + dy, parent));
    },
    [layout],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    const moved = d.moved;
    dragState.current = null;
    if (moved) {
      skipNextClick.current = true;
      savePos(posRef.current);
    }
  }, []);

  const handleMainClick = useCallback(() => {
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }
    onClick();
  }, [onClick]);

  const atLeft = pos.left < (typeof window !== 'undefined' ? window.innerWidth / 2 - FAB_SIZE / 2 : 120);

  if (!visible) return null;

  if (docked) {
    const stripStyle: React.CSSProperties = {
      position: layout === 'fixed' ? 'fixed' : 'absolute',
      bottom: `calc(${pos.bottom}px + env(safe-area-inset-bottom, 0px))`,
      width: STRIP_W,
      height: FAB_SIZE,
      border: 'none',
      cursor: 'pointer',
      zIndex: layout === 'fixed' ? 60 : 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF6600, #FF8533)',
      boxShadow: '0 4px 16px -2px rgba(255,102,0,0.4)',
      WebkitTapHighlightColor: 'transparent',
      padding: 0,
      borderRadius: atLeft ? '0 12px 12px 0' : '12px 0 0 12px',
    };
    if (atLeft) stripStyle.left = 0;
    else {
      stripStyle.right = 0;
      stripStyle.left = 'auto';
    }

    return (
      <button
        type="button"
        onClick={onUndock}
        style={stripStyle}
        className="active:scale-[0.98] transition-transform"
        aria-label={t('support_fab.expand')}
      >
        {atLeft ? <ChevronsRight size={16} color="#fff" /> : <ChevronsLeft size={16} color="#fff" />}
        {unread > 0 && (
          <span
            className="absolute w-2 h-2 rounded-full bg-red-500 border border-white"
            style={{ top: 6, [atLeft ? 'right' : 'left']: 2 }}
            aria-hidden
          />
        )}
      </button>
    );
  }

  const posStyle: React.CSSProperties = {
    position: layout === 'fixed' ? 'fixed' : 'absolute',
    left: pos.left,
    bottom: `calc(${pos.bottom}px + env(safe-area-inset-bottom, 0px))`,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: layout === 'fixed' ? 60 : 40,
    touchAction: 'none',
  };

  return (
    <div
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={posStyle}
    >
      <button
        type="button"
        onClick={handleMainClick}
        className="absolute inset-0 rounded-full border-0 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #FF6600, #FF8533)',
          boxShadow: '0 8px 24px -4px rgba(255,102,0,0.45), 0 2px 6px rgba(0,0,0,0.08)',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={t('support_fab.open_chat')}
      >
        <MessageCircle size={26} color="#fff" strokeWidth={2.2} />
        {unread > 0 && (
          <span
            className="absolute min-w-[18px] h-[18px] rounded-[10px] bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 border-2 border-white"
            style={{ top: 4, right: 4 }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <button
        type="button"
        data-tuck="true"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDock(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-0.5 -left-0.5 z-20 w-6 h-6 rounded-full bg-white/95 border border-orange-200/60 flex items-center justify-center active:scale-95 shadow-sm"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        aria-label={t('support_fab.tuck')}
      >
        <ChevronsLeft size={12} className="text-[#FF6600]" />
      </button>
    </div>
  );
};

export default SupportFab;
