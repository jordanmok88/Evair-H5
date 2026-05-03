/**
 * Physical SIM → Amazon discovery URLs.
 *
 * Rows are aligned with `SIM_CARD_PRODUCTS` in `constants.ts` (admin / "New Cards.xlsx"
 * catalogue). We do not have per-ASIN deep links until retail packaging ships; each
 * row uses the public Amazon search for EvairSIM plus the plan shape so customers
 * land on a tight result set.
 *
 * When real storefront or ASIN URLs exist, set `VITE_AMAZON_SIM_STOREFRONT_URL` to
 * the store home — per-SKU buttons can later be swapped to fixed URLs in this file.
 */

import type { SimCardProduct } from '../types';
import { SIM_CARD_PRODUCTS } from '../constants';

/** High-level card / use-case group (customer picks this first). */
export type AmazonSimFamilyId = 'phone_tablet' | 'trail_camera' | 'iot_light';

export interface AmazonSimFamilyDef {
    id: AmazonSimFamilyId;
}

/** Display order in the shop picker. */
export const AMAZON_SIM_FAMILIES: AmazonSimFamilyDef[] = [
    { id: 'phone_tablet' },
    { id: 'trail_camera' },
    { id: 'iot_light' },
];

/** Map each catalogue slug (excel row) to a family. */
const FAMILY_BY_PRODUCT_SLUG: Record<string, AmazonSimFamilyId> = {
    US_3_30: 'iot_light',
    US_5_30: 'iot_light',
    US_10_30: 'phone_tablet',
    US_15_30: 'phone_tablet',
    US_20_30: 'phone_tablet',
    US_50_30: 'phone_tablet',
    US_12_180: 'trail_camera',
    US_50_180: 'trail_camera',
};

export function listingsForFamily(family: AmazonSimFamilyId): SimCardProduct[] {
    return SIM_CARD_PRODUCTS.filter(p => FAMILY_BY_PRODUCT_SLUG[p.slug] === family).sort(
        (a, b) => a.gbs - b.gbs || a.validityDays - b.validityDays,
    );
}

/**
 * Amazon URL for a catalogue row. Uses search until ASINs are wired.
 */
export function buildAmazonUrlForProduct(product: SimCardProduct): string {
    const envUrl = (import.meta.env.VITE_AMAZON_SIM_STOREFRONT_URL as string | undefined)?.trim();
    if (envUrl && !envUrl.includes('PLACEHOLDER') && /^https?:\/\//i.test(envUrl)) {
        return envUrl;
    }
    const q = `EvairSIM US data ${product.gbs} GB ${product.validityDays} days`;
    return `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;
}
