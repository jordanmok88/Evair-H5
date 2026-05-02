/**
 * Presentation helpers for retail travel eSIM plan lists — duration sections,
 * minimum validity cutoff, and "Premium" SKU detection (US IP breakout tiers).
 */

import type { EsimPackage } from '../types';
import { packagePriceUsd } from '../services/dataService';

/** Omit very short-trip SKUs (< 7 approximate days). */
export const TRAVEL_RETAIL_MIN_APPROX_DAYS = 7;

const PREMIUM_NAME_RE =
    /\b(USIP|NONHKIP|NON-HK\s*IP|USA\s*BREAKOUT|US\s*IP\b|US-IP\b|US\s*區域)/i;

/** Approximate calendar length for grouping / filtering (months → days). */
export function approximateValidityDays(p: EsimPackage): number {
    if (p.durationUnit === 'MONTH') return p.duration * 30;
    return p.duration;
}

export function passesTravelRetailMinValidity(
    p: EsimPackage,
    minApproxDays = TRAVEL_RETAIL_MIN_APPROX_DAYS,
): boolean {
    return approximateValidityDays(p) >= minApproxDays;
}

/** Premium tier (US breakout IP plans — typically higher SKU price). */
export function isPremiumUsIpPlan(pkg: EsimPackage): boolean {
    const hay = `${pkg.name || ''}\n${pkg.description || ''}`;
    return PREMIUM_NAME_RE.test(hay);
}

export interface EsimValidityBucket {
    /** Sort ascending (approx days). */
    sortOrder: number;
    durationUnit: 'DAY' | 'MONTH';
    duration: number;
    packages: EsimPackage[];
}

export function bucketPlansByValidity(packages: EsimPackage[]): EsimValidityBucket[] {
    const eligible = packages.filter(passesTravelRetailMinValidity);

    const byKey = new Map<string, EsimPackage[]>();

    for (const p of eligible) {
        const key = `${p.durationUnit}|${p.duration}`;
        let list = byKey.get(key);
        if (!list) {
            list = [];
            byKey.set(key, list);
        }
        list.push(p);
    }

    const buckets: EsimValidityBucket[] = [];

    for (const [, pkgs] of byKey.entries()) {
        const first = pkgs[0];
        pkgs.sort((a, b) => {
            if (a.volume !== b.volume) return a.volume - b.volume;
            const pa = packagePriceUsd(a);
            const pb = packagePriceUsd(b);
            if (pa !== pb) return pa - pb;
            return (a.packageCode || '').localeCompare(b.packageCode || '');
        });

        buckets.push({
            sortOrder: approximateValidityDays(first),
            durationUnit: first.durationUnit,
            duration: first.duration,
            packages: pkgs,
        });
    }

    buckets.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        const unitRank = (u: 'DAY' | 'MONTH') => (u === 'DAY' ? 0 : 1);
        const ur = unitRank(a.durationUnit) - unitRank(b.durationUnit);
        if (ur !== 0) return ur;
        return a.duration - b.duration;
    });

    return buckets;
}
