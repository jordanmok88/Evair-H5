/**
 * Breakout-tier detection for curated retail storefronts — US IP variants, etc.
 * Used for (a) shop dedupe so standard vs premium SKUs aren't collapsed and
 * (b) plan-card badges ("Premium USIP").
 */

import type { EsimPackage } from '../types';

export interface RetailPremiumSkuTier {
    /** Stable ASCII slug folded into catalogue dedupe key. */
    slug: string;
    /** Short uppercase-style label shown after "Premium". */
    labelUpper: string;
}

const PREMIUM_TIER_RULES: ReadonlyArray<{ slug: string; labelUpper: string; pattern: RegExp }> = [
    { slug: 'usip', labelUpper: 'USIP', pattern: /\bUSIP\b/i },
    { slug: 'nonhkip', labelUpper: 'NONHKIP', pattern: /\bNONHKIP\b/i },
    { slug: 'nonhk', labelUpper: 'NONHK', pattern: /\bNON[- ]?HK(?:IP)?\b/i },
    { slug: 'us-breakout', labelUpper: 'US IP', pattern: /\bUSA\s*BREAKOUT\b|\bUS-IP\b|\bUS\s*IP\b/i },
    {
        slug: 'us-zone',
        labelUpper: 'US',
        pattern: /\bUS\s*區域\b/,
    },
];

/**
 * Inspect package name/description for a known premium egress / breakout SKU.
 */
export function inferRetailPremiumSkuTier(pkg: EsimPackage): RetailPremiumSkuTier | null {
    const haystack = `${pkg.name || ''}\n${pkg.description || ''}`;
    for (const r of PREMIUM_TIER_RULES) {
        if (r.pattern.test(haystack)) return { slug: r.slug, labelUpper: r.labelUpper };
    }
    return null;
}

/** Suffix appended to catalogue dedupe key — stable per slug, empty string = standard SKU. */
export function shopDedupePremiumSuffix(pkg: EsimPackage): string {
    const t = inferRetailPremiumSkuTier(pkg);
    return t?.slug ?? '';
}

/** True when SKU should wear the amber premium framing (any breakout tier above). */
export function isPremiumRetailSku(pkg: EsimPackage): boolean {
    return inferRetailPremiumSkuTier(pkg) !== null;
}

const PAREN_TIER_TRIM =
    /\s*\(\s*(?:NONHKIP|NON[- ]?HK(?:IP)?|USIP|US\s+IP|USA\s*BREAKOUT|US-IP)\s*\)\s*/gi;

/**
 * Drops redundant bracketed breakout labels from banner title when tier is already in the badge.
 */
export function sanitizedRetailPlanMarketingName(pkg: EsimPackage): string {
    const raw = (pkg.name || '').replace(/\s+/g, ' ').trim();
    const tier = inferRetailPremiumSkuTier(pkg);
    if (!tier) return raw;

    let name = raw.replace(PAREN_TIER_TRIM, ' ');
    if (tier.slug === 'usip') name = name.replace(/\bUSIP\b/gi, ' ');
    name = name.replace(/\s{2,}/g, ' ').trim();

    return name.length > 0 ? name : raw;
}
