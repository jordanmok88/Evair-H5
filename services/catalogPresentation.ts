/**
 * Retail eSIM shop presentation — shared by H5 shop, desktop travel grid, and
 * checkout (via `packagePriceUsd` on mutated `price` micro-cents).
 *
 * Rules (product – US outbound retail):
 *  1. Drop plans under 1 GiB (binary – matches `EsimPackage.volume` in bytes).
 *  2. Within each market (single-country ISO set or supplier region ID),
 *     collapse duplicate-shaped plans (same data volume + duration + breakout/IP
 *     tier inferred from SKU name/description) to the cheapest SKU — **tier is
 *     intentional**: e.g. 7-day 1 GB standard vs USIP must both surface.
 *  3. Snap each surviving SKU’s retail USD to `⌊usd⌋ + 0.99` so displayed
 *     and Stripe-posted totals match after `dataService` rewrites micro-cents.
 *
 * Backend / admin: backstage should ideally mirror this policy when saving list
 * price so Laravel admin dashboards and outbound API stay aligned. Until then,
 * H5 treats the backstage float as wholesale input and snaps at read time.
 */

import type { EsimPackage } from '../types';
import { packagePriceUsd } from './esimApi';
import { shopDedupePremiumSuffix } from './retailPremiumSkuTier';

/** 1 GiB — minimum data shown in purchase flows (top-up catalogue bypasses). */
export const MIN_SHOP_CATALOG_VOLUME_BYTES = 1024 ** 3;

/**
 * Canonical X.99 retail snap: same tier as storefront psychology; never lowers
 * below the next lower dollar + 0.99 under typical positive prices.
 */
export function snapRetailUsdToXDot99(usd: number): number {
    if (!Number.isFinite(usd) || usd <= 0) return usd;
    const base = Math.floor(usd + 1e-9);
    let snapped = base + 0.99;
    if (snapped < usd - 1e-6) snapped = base + 1 + 0.99;
    return Math.round(snapped * 100) / 100;
}

function usdToRetailMicroCents(usd: number): number {
    return Math.round(usd * 10000);
}

/** Single-country vs regional market bucket for duplicate detection. */
function marketDedupeKey(p: EsimPackage): string {
    if (p.supplierRegionCode) return `r:${p.supplierRegionCode}`;
    const raw =
        p.coverageCodes && p.coverageCodes.length > 0
            ? p.coverageCodes
            : (p.location || '').split(',').map(s => s.trim()).filter(Boolean);
    const canon = [...raw].map(c => c.toUpperCase()).sort().join('+');
    return `c:${canon}`;
}

function planShapeKey(p: EsimPackage): string {
    return `${p.volume}|${p.duration}|${p.durationUnit}`;
}

/**
 * Duplicate-shaped plans collapse to the cheapest **only within the same
 * breakout/IP tier**. Standard vs US IP (same GB × days) must stay separate.
 */
function dedupeCompositeKey(p: EsimPackage): string {
    const tier = shopDedupePremiumSuffix(p);
    const tierSeg = tier ? `|t:${tier}` : '';
    return `${marketDedupeKey(p)}#${planShapeKey(p)}${tierSeg}`;
}

/**
 * Apply shop rules to BASE purchase catalogues. Pass `omitShopPresentation`
 * at the fetch layer for top-up fallbacks that still hit `/app/packages`.
 */
export function finalizeShopCatalogPackages(packages: EsimPackage[]): EsimPackage[] {
    const volOk = packages.filter(p => p.volume >= MIN_SHOP_CATALOG_VOLUME_BYTES);

    const best = new Map<string, EsimPackage>();
    for (const p of volOk) {
        const k = dedupeCompositeKey(p);
        const prev = best.get(k);
        if (!prev || packagePriceUsd(p) < packagePriceUsd(prev)) {
            best.set(k, p);
        }
    }

    return Array.from(best.values()).map(p => {
        const rawUsd = packagePriceUsd(p);
        const snapped = snapRetailUsdToXDot99(rawUsd);
        if (Math.abs(snapped - rawUsd) < 0.0005) return p;
        return {
            ...p,
            price: usdToRetailMicroCents(snapped),
            priceIsRetail: true,
        };
    });
}
