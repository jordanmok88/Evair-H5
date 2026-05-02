import { CARRIER_MAP } from '../constants';
import type { RetailCarrierHint } from '../constants/carriersFromSupplier.generated';
import { CARRIER_REDTEA_SNAPSHOT } from '../constants/carriersFromSupplier.generated';

/**
 * Resolved carrier hints for retailer UI — Red Tea snapshot (from packaged API pull)
 * wins over handwritten {@link CARRIER_MAP} once populated.
 *
 * Backend `networkPartnerSummary` (when wired) overrides this layer in {@link planCardNetworkLine}.
 */
export function retailCarrierRowForIso(
    iso: string | null | undefined,
): RetailCarrierHint | undefined {
    if (!iso?.trim()) return undefined;
    const key = iso.trim().toUpperCase();
    return CARRIER_REDTEA_SNAPSHOT[key] ?? CARRIER_MAP[key];
}
