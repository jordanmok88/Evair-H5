import { useEffect } from 'react';

/**
 * Sets `overflow: hidden` on `html` and `body` while `locked` — typical modal / drawer behaviour.
 * Restores prior inline styles on cleanup (supports nested callers only if they nest sequentially;
 * marketing drawers are mutually exclusive today).
 */
export function useBodyScrollLock(locked: boolean): void {
    useEffect(() => {
        if (!locked) return;
        const html = document.documentElement;
        const body = document.body;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
        };
    }, [locked]);
}
