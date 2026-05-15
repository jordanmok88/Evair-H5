export interface PendingEsimOrder {
    /** Order ID (numeric) from POST /app/orders — used to poll order detail */
    orderId?: number;
    /** Order number string from POST /app/orders — for display / email */
    orderNo?: string;
    packageName?: string;
    email?: string;
    countryCode?: string;
    sessionId?: string;
    /** Legacy fields — kept for type compat, no longer written by new flow */
    packageCode?: string;
    transactionId?: string;
    amount?: number;
}

const CURRENT_PENDING_KEY = 'pending_esim_order';
const PENDING_BY_SESSION_KEY = 'pending_esim_order_by_session_v1';

type PendingBySession = Record<string, PendingEsimOrder>;

function readCurrentPending(): PendingEsimOrder | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(CURRENT_PENDING_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as PendingEsimOrder;
    } catch (err) {
        console.error('[esimCheckoutPending] pending_esim_order corrupt', err);
        try { localStorage.removeItem(CURRENT_PENDING_KEY); } catch { /* ignore */ }
        return null;
    }
}

function readPendingBySession(): PendingBySession {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(PENDING_BY_SESSION_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed as PendingBySession;
    } catch {
        try { localStorage.removeItem(PENDING_BY_SESSION_KEY); } catch { /* ignore */ }
        return {};
    }
}

function writePendingBySession(map: PendingBySession): void {
    if (typeof window === 'undefined') return;
    try {
        if (Object.keys(map).length === 0) {
            localStorage.removeItem(PENDING_BY_SESSION_KEY);
            return;
        }
        localStorage.setItem(PENDING_BY_SESSION_KEY, JSON.stringify(map));
    } catch {
        /* quota / private mode */
    }
}

function removeCurrentPendingIfMatches(sessionId?: string | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (!sessionId) {
            localStorage.removeItem(CURRENT_PENDING_KEY);
            return;
        }
        const current = readCurrentPending();
        if (!current || current.sessionId === sessionId) {
            localStorage.removeItem(CURRENT_PENDING_KEY);
        }
    } catch {
        /* ignore */
    }
}

export function storePendingEsimOrder(pending: PendingEsimOrder): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_PENDING_KEY, JSON.stringify(pending));
    const sessionId = pending.sessionId?.trim();
    if (!sessionId) return;

    const bySession = readPendingBySession();
    bySession[sessionId] = pending;
    writePendingBySession(bySession);
}

export function consumePendingEsimOrder(sessionId?: string | null): PendingEsimOrder | null {
    const normalizedSessionId = sessionId?.trim() || '';
    if (normalizedSessionId) {
        const bySession = readPendingBySession();
        const match = bySession[normalizedSessionId];
        if (match) {
            delete bySession[normalizedSessionId];
            writePendingBySession(bySession);
            removeCurrentPendingIfMatches(normalizedSessionId);
            return match;
        }
    }

    const current = readCurrentPending();
    if (!current) return null;

    removeCurrentPendingIfMatches(current.sessionId);
    if (current.sessionId) {
        const bySession = readPendingBySession();
        delete bySession[current.sessionId];
        writePendingBySession(bySession);
    }
    return current;
}
