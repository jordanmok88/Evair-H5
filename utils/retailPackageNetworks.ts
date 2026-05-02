import { CARRIER_MAP } from '../constants';
import type { EsimPackage } from '../types';

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
 * Line shown under “4G/5G” on plan cards. Uses {@link CARRIER_MAP} for single-country
 * packages; regional/global uses `supplierRegionName` when present.
 */
export function planCardNetworkLine(pkg: EsimPackage): string | null {
    if (packageCoversMultipleIso2(pkg)) {
        return pkg.supplierRegionName?.trim() || null;
    }
    const iso = primaryIso2FromPackage(pkg);
    if (!iso) return null;
    const row = CARRIER_MAP[iso];
    if (!row?.carrier) return null;
    return row.carrier.replace(/\s*\/\s*/g, ' · ');
}
