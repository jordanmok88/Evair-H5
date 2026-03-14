import { useEffect, useRef, useCallback } from 'react';

const EDGE_ZONE = 28;       // px from left edge to start listening
const TRIGGER_DISTANCE = 80; // px swipe distance to fire callback
const MAX_Y_DRIFT = 60;     // px vertical drift tolerance

/**
 * Detects a swipe gesture starting from the left edge of the screen
 * and calls `onBack` when the user swipes far enough to the right.
 * Returns a ref to attach to the scrollable container.
 */
export function useEdgeSwipeBack(onBack: () => void) {
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const indicator = useRef<HTMLDivElement | null>(null);
  const stableBack = useRef(onBack);
  stableBack.current = onBack;

  const createIndicator = useCallback(() => {
    if (indicator.current) return indicator.current;
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '50%',
      transform: 'translateY(-50%) translateX(-100%)',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'rgba(255,102,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      transition: 'opacity 0.15s',
      opacity: '0',
      pointerEvents: 'none',
      boxShadow: '0 2px 12px rgba(255,102,0,0.3)',
    });
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    document.body.appendChild(el);
    indicator.current = el;
    return el;
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX > EDGE_ZONE) return;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      swiping.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!swiping.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      if (dy > MAX_Y_DRIFT) {
        swiping.current = false;
        hideIndicator();
        return;
      }

      if (dx > 10) {
        const el = createIndicator();
        const progress = Math.min(dx / TRIGGER_DISTANCE, 1);
        const offset = Math.min(dx * 0.6, 50);
        el.style.transform = `translateY(-50%) translateX(${offset - 18}px)`;
        el.style.opacity = String(Math.min(progress * 1.5, 1));
        el.style.background = progress >= 1
          ? 'rgba(255,102,0,1)'
          : 'rgba(255,102,0,0.55)';
        el.style.width = progress >= 1 ? '40px' : '36px';
        el.style.height = progress >= 1 ? '40px' : '36px';
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swiping.current) return;
      swiping.current = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      hideIndicator();

      if (dx >= TRIGGER_DISTANCE && dy <= MAX_Y_DRIFT) {
        stableBack.current();
      }
    };

    const hideIndicator = () => {
      if (indicator.current) {
        indicator.current.style.opacity = '0';
        indicator.current.style.transform = 'translateY(-50%) translateX(-100%)';
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      if (indicator.current) {
        indicator.current.remove();
        indicator.current = null;
      }
    };
  }, [createIndicator]);
}
