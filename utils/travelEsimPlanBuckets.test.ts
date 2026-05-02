import { describe, expect, it } from 'vitest';
import type { EsimPackage } from '../types';
import {
    bucketPlansByValidity,
    sortRetailBucketsMostPopularFirst,
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
