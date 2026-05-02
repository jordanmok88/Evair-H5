import { describe, expect, it } from 'vitest';
import type { EsimPackage } from '../types';
import {
    bucketPlansByValidity,
    segmentRetailBucketsForPresentation,
    sortRetailBucketsMostPopularFirst,
    type EsimValidityBucket,
} from './travelEsimPlanBuckets';

function dayPkg(packageCode: string, durationDays: number, name = ''): EsimPackage {
    return {
        packageCode,
        name: name || packageCode,
        price: 2 * 10000,
        priceIsRetail: true,
        currencyCode: 'USD',
        volume: 1024 ** 3,
        unusedValidTime: durationDays,
        duration: durationDays,
        durationUnit: 'DAY',
        location: 'US',
        description: '',
        activeType: 1,
        coverageCodes: ['US'],
    };
}

function mkBucket(days: number, pkgCount: number, sortOrder = days): EsimValidityBucket {
    const pkgs = Array.from({ length: pkgCount }, (_, i) => dayPkg(`d${days}-${i}`, days));
    return {
        sortOrder,
        durationUnit: 'DAY',
        duration: days,
        packages: pkgs,
    };
}

describe('segmentRetailBucketsForPresentation', () => {
    it('shows singleton tiers before multis when chronological order demands it (e.g. 7/15/60 then 90/180)', () => {
        const sorted = sortRetailBucketsMostPopularFirst([
            mkBucket(7, 1),
            mkBucket(15, 1),
            mkBucket(60, 1),
            mkBucket(90, 2),
            mkBucket(180, 2),
        ]);
        expect(sorted.map(b => b.duration)).toEqual([7, 15, 60, 90, 180]);

        const segs = segmentRetailBucketsForPresentation(sorted);
        expect(segs.map(s => s.kind)).toEqual(['singletonRoll', 'multi', 'multi']);
        expect(segs[0].kind === 'singletonRoll' ? segs[0].buckets.map(b => b.duration) : []).toEqual([
            7, 15, 60,
        ]);
        expect(segs[1].kind === 'multi' ? segs[1].bucket.duration : NaN).toBe(90);
        expect(segs[2].kind === 'multi' ? segs[2].bucket.duration : NaN).toBe(180);
    });

    it('starts a new singleton roll after a multi tier without merging distant singletons', () => {
        const sorted = sortRetailBucketsMostPopularFirst([
            mkBucket(60, 1),
            mkBucket(90, 2),
            mkBucket(365, 1),
        ]);
        const segs = segmentRetailBucketsForPresentation(sorted);
        expect(segs.map(s => s.kind)).toEqual(['singletonRoll', 'multi', 'singletonRoll']);
    });
});

describe('sortRetailBucketsMostPopularFirst', () => {
    it('places the 30-day bucket before longer or shorter durations', () => {
        const buckets = bucketPlansByValidity([
            dayPkg('seven', 7),
            dayPkg('thirty', 30),
            dayPkg('sixty', 60),
        ]);
        expect(buckets.map(b => b.duration)).toEqual([7, 30, 60]);

        const sorted = sortRetailBucketsMostPopularFirst(buckets);
        expect(sorted.map(b => b.duration)).toEqual([30, 7, 60]);
    });
});
