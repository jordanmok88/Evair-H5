import { useEffect, useRef } from 'react';

/**
 * Integrates SPA sub-view navigation with the browser History API,
 * enabling iOS Safari's swipe-from-edge-to-go-back gesture.
 *
 * @param depth  Current navigation depth (0 = root, 1+ = sub-view)
 * @param onBack Called when user swipes back (popstate)
 */
export function useSwipeBack(depth: number, onBack: () => void) {
  const prevRef = useRef(0);
  const swipeRef = useRef(false);

  useEffect(() => {
    const diff = depth - prevRef.current;
    if (diff > 0 && !swipeRef.current) {
      for (let i = 0; i < diff; i++) window.history.pushState(null, '');
    }
    swipeRef.current = false;
    prevRef.current = depth;
  }, [depth]);

  useEffect(() => {
    if (depth === 0) return;
    const handler = () => {
      swipeRef.current = true;
      onBack();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [depth, onBack]);
}
