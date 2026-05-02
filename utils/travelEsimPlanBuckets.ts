/**
 * Presentation helpers for travel eSIM retail plan lists — validity sections,
 * 1-calendar-day SKU hide, and breakout-tier badges (delegated).
 */

import type { EsimPackage } from '../types';
import { packagePriceUsd } from '../services/dataService';
import { isPremiumRetailSku } from '../services/retailPremiumSkuTier';

export { inferRetailPremiumSkuTier, sanitizedRetailPlanMarketingName } from '../services/retailPremiumSkuTier';

/** @deprecated Prefer `isPremiumRetailSku` — kept so older imports keep working */
export function isPremiumUsIpPlan(pkg: EsimPackage): boolean {
    return isPremiumRetailSku(pkg);
}

/** True for single-day prepaid SKUs (`durationUnit === DAY` + `duration === 1`). */
export function hidesOneCalendarDayRetailPlan(p: EsimPackage): boolean {
    return p.durationUnit === 'DAY' && p.duration === 1;
}

export function passesRetailTravelPlanListingFilter(p: EsimPackage): boolean {
    return !hidesOneCalendarDayRetailPlan(p);
}

/** Approximate calendar length for grouping (months → approximate days). */
export function approximateValidityDays(p: EsimPackage): number {
    if (p.durationUnit === 'MONTH') return p.duration * 30;
    return p.duration;
}

export interface EsimValidityBucket {
    /** Sort ascending (approx days). */
    sortOrder: number;
    durationUnit: 'DAY' | 'MONTH';
    duration: number;
    packages: EsimPackage[];
}

/** Canonical “hero” dwell length — surfaced first under “Most popular”. */
export const RETAIL_POPULAR_DAY_DURATION = 30;

export function isMostPopularRetailBucket(bucket: EsimValidityBucket): boolean {
    return bucket.durationUnit === 'DAY' && bucket.duration === RETAIL_POPULAR_DAY_DURATION;
}

function compareValidityBuckets(a: EsimValidityBucket, b: EsimValidityBucket): number {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const unitRank = (u: 'DAY' | 'MONTH') => (u === 'DAY' ? 0 : 1);
    const ur = unitRank(a.durationUnit) - unitRank(b.durationUnit);
    if (ur !== 0) return ur;
    return a.duration - b.duration;
}

/** Puts exactly-one 30‑DAY bucket first (“most popular”), then every other validity ascending. */
export function sortRetailBucketsMostPopularFirst(buckets: EsimValidityBucket[]): EsimValidityBucket[] {
    const popular: EsimValidityBucket[] = [];
    const rest: EsimValidityBucket[] = [];
    for (const b of buckets) {
        if (isMostPopularRetailBucket(b)) popular.push(b);
        else rest.push(b);
    }
    popular.sort(compareValidityBuckets);
    rest.sort(compareValidityBuckets);
    return [...popular, ...rest];
}

export function bucketPlansByValidity(packages: EsimPackage[]): EsimValidityBucket[] {
    const eligible = packages.filter(passesRetailTravelPlanListingFilter);

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

    buckets.sort(compareValidityBuckets);

    return buckets;
}
