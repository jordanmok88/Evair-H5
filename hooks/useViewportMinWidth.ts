import { useSyncExternalStore } from 'react';

/**
 * Subscribes to `matchMedia("(min-width: Npx)")` so layout can branch client-side
 * without stale closure on resize (CustomerApp chrome vs centred phone mock).
 */
export function useViewportMinWidth(minPx: number): boolean {
    const query = `(min-width: ${minPx}px)`;
    const subscribe = (onChange: () => void) => {
        const mq = window.matchMedia(query);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    };
    const getSnapshot = () => window.matchMedia(query).matches;
    const getServerSnapshot = () => false;
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
