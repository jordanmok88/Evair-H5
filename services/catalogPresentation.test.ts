import { describe, expect, it } from 'vitest';
import type { EsimPackage } from '../types';
import {
    finalizeShopCatalogPackages,
    MIN_SHOP_CATALOG_VOLUME_BYTES,
    snapRetailUsdToXDot99,
} from './catalogPresentation';
import { packagePriceUsd } from './esimApi';

function basePkg(
    code: string,
    opts: Pick<EsimPackage, 'volume' | 'duration' | 'price'> &
        Partial<
            Pick<
                EsimPackage,
                | 'location'
                | 'coverageCodes'
                | 'supplierRegionCode'
                | 'durationUnit'
                | 'priceIsRetail'
                | 'name'
            >
        >,
): EsimPackage {
    const du = opts.durationUnit ?? 'DAY';
    const d = opts.duration;
    return {
        packageCode: code,
        name: opts.name ?? code,
        price: opts.price,
        currencyCode: 'USD',
        volume: opts.volume,
        unusedValidTime: d,
        duration: d,
        durationUnit: du,
        location: opts.location ?? 'KR',
        description: '',
        activeType: 1,
        coverageCodes: opts.coverageCodes,
        supplierRegionCode: opts.supplierRegionCode,
        priceIsRetail: opts.priceIsRetail ?? true,
    };
}

describe('snapRetailUsdToXDot99', () => {
    it('floors dollar then adds ninety-nine cents', () => {
        expect(snapRetailUsdToXDot99(1.6)).toBe(1.99);
        expect(snapRetailUsdToXDot99(11.05)).toBe(11.99);
        expect(snapRetailUsdToXDot99(4.99)).toBe(4.99);
    });
});

describe('finalizeShopCatalogPackages', () => {
    it('removes packages under 1 GiB', () => {
        const small = basePkg('a', {
            volume: 100 * 1024 * 1024,
            duration: 7,
            price: 6000,
        });
        const big = basePkg('b', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 25000,
        });
        const out = finalizeShopCatalogPackages([small, big]);
        expect(out).toHaveLength(1);
        expect(out[0]!.packageCode).toBe('b');
    });

    it('keeps only the cheapest duplicate shape per market for the same breakout tier', () => {
        const cheap = basePkg('cheap', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 16000,
            name: 'A',
        });
        const pricey = basePkg('pricy', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 18400,
            name: 'B',
        });
        const out = finalizeShopCatalogPackages([cheap, pricey]);
        expect(out).toHaveLength(1);
        expect(out[0]!.packageCode).toBe('cheap');
        expect(packagePriceUsd(out[0]!)).toBe(1.99);
    });

    it('does not collapse standard vs USIP SKU with identical GB × duration', () => {
        const std = basePkg('std', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 365,
            price: 20000,
            name: 'USA 10GB — 365DAYS',
        });
        const usip = basePkg('usip', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 365,
            price: 88000,
            name: 'USA 10GB — 365DAYS (USIP)',
        });
        const out = finalizeShopCatalogPackages([std, usip]);
        expect(out).toHaveLength(2);
        const codes = new Set(out.map(p => p.packageCode));
        expect(codes.has('std')).toBe(true);
        expect(codes.has('usip')).toBe(true);
    });

    it('still keeps the cheaper duplicate when breakout tier tokens match', () => {
        const cheap = basePkg('cheap-usip', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 16000,
            name: 'Plan (USIP)',
        });
        const pricey = basePkg('pricy-usip', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 18400,
            name: 'Alt (USIP)',
        });
        const out = finalizeShopCatalogPackages([cheap, pricey]);
        expect(out).toHaveLength(1);
        expect(out[0]!.packageCode).toBe('cheap-usip');
    });

    it('does not merge different countries', () => {
        const kr = basePkg('kr', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 19900,
            location: 'KR',
        });
        const jp = basePkg('jp', {
            volume: MIN_SHOP_CATALOG_VOLUME_BYTES,
            duration: 7,
            price: 19900,
            location: 'JP',
        });
        const out = finalizeShopCatalogPackages([kr, jp]);
        expect(out).toHaveLength(2);
    });
});
