import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
    const store = new Map<string, string>();
    const localStorageShim = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() {
            return store.size;
        },
    };

    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: localStorageShim,
    });
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: globalThis,
    });
});

import { consumePendingEsimOrder, storePendingEsimOrder } from './esimCheckoutPending';

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('eSIM checkout pending state', () => {
    test('consumes the pending order that matches Stripe session_id, not the latest checkout', () => {
        storePendingEsimOrder({
            orderId: 101,
            orderNo: 'ORD-A',
            email: 'a@example.com',
            sessionId: 'cs_test_a',
        });
        storePendingEsimOrder({
            orderId: 202,
            orderNo: 'ORD-B',
            email: 'b@example.com',
            sessionId: 'cs_test_b',
        });

        expect(consumePendingEsimOrder('cs_test_a')).toMatchObject({
            orderId: 101,
            orderNo: 'ORD-A',
        });
        expect(consumePendingEsimOrder('cs_test_b')).toMatchObject({
            orderId: 202,
            orderNo: 'ORD-B',
        });
    });

    test('falls back to the legacy current pending key when no session_id is available', () => {
        storePendingEsimOrder({
            orderId: 303,
            orderNo: 'ORD-C',
            email: 'c@example.com',
        });

        expect(consumePendingEsimOrder(null)).toMatchObject({
            orderId: 303,
            orderNo: 'ORD-C',
        });
        expect(consumePendingEsimOrder(null)).toBeNull();
    });
});
