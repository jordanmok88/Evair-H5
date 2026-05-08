import { useSyncExternalStore } from 'react';

/**
 * Subscribes to `matchMedia("(min-width: Npx)")` so layout can branch client-side
 * without stale closure on resize (CustomerApp chrome vs centred phone mock).
 *
 * **Why not `matchMedia` alone:** opening/closing full-screen overlays (e.g. marketing live
 * chat) can show or hide the **vertical scrollbar** without changing `window.outerWidth`.
 * The layout viewport width then crosses breakpoints (768 / `md:`) but some engines do not
 * emit `MediaQueryList.change`. We also listen to `resize`, `visualViewport`, and a
 * `ResizeObserver` on `document.documentElement` so `SiteHeader`, {@link LiveChatEdgeLauncher},
 * and {@link MarketingContactDrawer} stay aligned with Tailwind after the drawer closes.
 */
export function useViewportMinWidth(minPx: number): boolean {
    const query = `(min-width: ${minPx}px)`;
    const subscribe = (onChange: () => void) => {
        if (typeof window === 'undefined') {
            return () => {};
        }
        const mq = window.matchMedia(query);
        mq.addEventListener('change', onChange);
        window.addEventListener('resize', onChange);

        const vv = window.visualViewport;
        vv?.addEventListener('resize', onChange);
        vv?.addEventListener('scroll', onChange);

        let ro: ResizeObserver | null = null;
        try {
            ro = new ResizeObserver(() => {
                onChange();
            });
            ro.observe(document.documentElement);
        } catch {
            /* ResizeObserver unsupported */
        }

        return () => {
            mq.removeEventListener('change', onChange);
            window.removeEventListener('resize', onChange);
            vv?.removeEventListener('resize', onChange);
            vv?.removeEventListener('scroll', onChange);
            ro?.disconnect();
        };
    };
    const getSnapshot = () =>
        typeof window !== 'undefined' && window.matchMedia(query).matches;
    const getServerSnapshot = () => false;
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
