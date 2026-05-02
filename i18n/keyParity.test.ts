import { describe, expect, test } from 'vitest';

import es from './es';
import en from './en';
import zh from './zh';

type Dict = Record<string, unknown>;

function leafKeys(obj: Dict, prefix = ''): Set<string> {
    const keys = new Set<string>();
    for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            const nested = leafKeys(v as Dict, p);
            for (const nk of nested) keys.add(nk);
        } else {
            keys.add(p);
        }
    }
    return keys;
}

describe('i18n key parity (en ⇄ zh ⇄ es)', () => {
    const ek = leafKeys(en as Dict);
    const zk = leafKeys(zh as Dict);
    const sk = leafKeys(es as Dict);

    test('zh has every path en does', () => {
        const missing = [...ek].filter((k) => !zk.has(k));
        expect(missing).toEqual([]);
    });

    test('es has every path en does', () => {
        const missing = [...ek].filter((k) => !sk.has(k));
        expect(missing).toEqual([]);
    });

    test('en has paths introduced only in zh (no orphaned zh-only leaves)', () => {
        const extra = [...zk].filter((k) => !ek.has(k));
        expect(extra).toEqual([]);
    });

    test('en has paths introduced only in es (no orphaned es-only leaves)', () => {
        const extra = [...sk].filter((k) => !ek.has(k));
        expect(extra).toEqual([]);
    });
});
