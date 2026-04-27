/**
 * 浮动客服入口（Floating Action Button）
 *
 * 显示规则：
 * - 仅在主功能 Tab（SIM_CARD / ESIM / INBOX / PROFILE）展示
 * - 进入聊天页（DIALER）后由父组件控制隐藏，避免遮挡
 *
 * 位置：默认左下角并加上 safe-area，避免挡住右下角主按钮；支持拖拽，
 * 松手后记住位置（localStorage）。
 */

import React, { useCallback, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useUnreadChat } from '../hooks/useUnreadChat';

interface SupportFabProps {
  /** 仅在 visible=true 时挂载 / 计数 */
  visible: boolean;
  onClick: () => void;
}

const STORAGE_KEY = 'evair_support_fab_pos_v1';

type Pos = { left: number; bottom: number };

function loadSaved(): Pos | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function clampPos(left: number, bottom: number, parent: HTMLElement): Pos {
  const pad = 8;
  const size = 56;
  const pw = parent.clientWidth;
  const ph = parent.clientHeight;
  const minB = 36;
  return {
    left: Math.min(Math.max(pad, left), Math.max(pad, pw - size - pad)),
    bottom: Math.min(Math.max(minB, bottom), Math.max(minB, ph - size - pad)),
  };
}

const SupportFab: React.FC<SupportFabProps> = ({ visible, onClick }) => {
  const { unread } = useUnreadChat(visible);
  const hostRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<Pos>(() => loadSaved() ?? { left: 16, bottom: 100 });
  const posRef = useRef(pos);
  posRef.current = pos;

  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startL: number;
    startB: number;
    moved: boolean;
  } | null>(null);

  const skipNextClick = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startL: posRef.current.left,
      startB: posRef.current.bottom,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragState.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = d.startY - e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    const parent = hostRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return;
    setPos(clampPos(d.startL + dx, d.startB + dy, parent));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
      } catch {
        /* private mode / quota */
      }
    }
  }, []);

  const handleClick = useCallback(() => {
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }
    onClick();
  }, [onClick]);

  if (!visible) return null;

  return (
    <button
      ref={hostRef}
      type="button"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="open support chat"
      style={{
        position: 'absolute',
        left: pos.left,
        bottom: `calc(${pos.bottom}px + env(safe-area-inset-bottom, 0px))`,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6600, #FF8533)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 8px 24px -4px rgba(255,102,0,0.45), 0 2px 6px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
      }}
      className="active:scale-95 transition-transform"
    >
      <MessageCircle size={26} color="#fff" strokeWidth={2.2} />
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: '#EF4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
          }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

export default SupportFab;
