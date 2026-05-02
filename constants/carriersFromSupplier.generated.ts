/**
 * Parsed operator / network hints from Red Tea `POST …/package/list` (single-country BASE rows).
 *
 * **Do not edit by hand.** Regenerate locally:
 *
 * ```
 * cp ../Evair-Laravel/.env.example .env.redtea.pull   # optional template
 * # Put REDTEA_ACCESS_CODE / REDTEA_SECRET_KEY in .env.redtea.pull (see scripts/README-redtea-carriers.md)
 * npm run carriers:pull
 * ```
 *
 * Shipped bundles never contain API secrets — only this derived map.
 */

export type RetailCarrierHint = {
    carrier: string;
    network: string;
};

export const CARRIER_REDTEA_SNAPSHOT_GENERATED_AT_ISO: string | null = null;

/** ISO-3166 Alpha-2 (uppercase). Empty until first successful pull. */
export const CARRIER_REDTEA_SNAPSHOT: Record<string, RetailCarrierHint> = {};
