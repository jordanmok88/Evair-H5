import type { EsimPackage } from '../types';

import { retailCarrierRowForIso } from './retailCarrierLookup';

/** Match plan-card typography (`CARRIER_MAP` uses middle dots between carriers). */
function formatNetworkPhrase(text: string): string {
    return text.replace(/\s*\/\s*/g, ' · ').trim();
}

/** Primary ISO-2 for single-country retail cards. */
export function primaryIso2FromPackage(pkg: EsimPackage): string | null {
    const cc = pkg.coverageCodes?.filter(Boolean);
    if (cc?.length) return cc[0]!.toUpperCase();
    const loc = pkg.location?.split(',')[0]?.trim();
    return loc ? loc.toUpperCase() : null;
}

export function packageCoversMultipleIso2(pkg: EsimPackage): boolean {
    const codes = pkg.coverageCodes?.filter(Boolean);
    if (codes && codes.length > 1) return true;
    return (pkg.location?.split(',').map(s => s.trim()).filter(Boolean).length ?? 0) > 1;
}

/**
 * Line shown under “4G/5G” on plan cards — backend snapshot first,
 * then Red Tea-derived static snapshot ({@link CARRIER_REDTEA_SNAPSHOT}),
 * then handwritten map; regional/global uses `supplierRegionName` when present.
 *
 * @param fallbackCountryIso ISO-2 for the storefront row/context (single-country picker)
 *                           when facets omit reliable `coverageCodes` / location.
 */
export function planCardNetworkLine(pkg: EsimPackage, fallbackCountryIso?: string | null): string | null {
    const fromBackend = pkg.networkPartnerSummary?.trim();
    if (fromBackend) {
        return formatNetworkPhrase(fromBackend);
    }

    if (packageCoversMultipleIso2(pkg)) {
        return pkg.supplierRegionName?.trim() || null;
    }
    const tryIso = (iso: string | null | undefined): string | null => {
        const up = iso?.trim().toUpperCase();
        if (!up) return null;
        const row = retailCarrierRowForIso(up);
        if (!row?.carrier) return null;
        return formatNetworkPhrase(row.carrier);
    };

    let line = tryIso(primaryIso2FromPackage(pkg));
    if (line) return line;
    line = tryIso(fallbackCountryIso ?? null);
    return line;
}
