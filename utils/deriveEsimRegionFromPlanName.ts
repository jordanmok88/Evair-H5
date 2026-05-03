import type { Country } from '../types';

const REGION_NAMES_EN = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Infer a coarse ISO coverage hint from supplier plan names ("China mainland 20GB...", etc.).
 * Longer‑match regions are checked before shorter ones ("Hong Kong" before bare "china").
 */
const REGION_HINTS: Array<{ code: string; matches: RegExp }> = [
  { code: 'HK', matches: /\bhong\s+kong\b/i },
  { code: 'MO', matches: /\b(?:macao|macau)\b/i },
  { code: 'TW', matches: /\btaiwan\b/i },
  { code: 'US', matches: /\b(?:united states|usa|u\.s\.(?:a\.)?)\b/i },
  { code: 'CN', matches: /\bchina\b(?:\s+mainland\b)?/i },
  { code: 'JP', matches: /\bjapan\b/i },
  { code: 'KR', matches: /\bsouth korea\b|\brepublic of korea\b|\bROK\b/i },
  { code: 'AU', matches: /\baustralia\b/i },
  { code: 'GB', matches: /\bunited kingdom\b|\buk\b\s+\d|\bBritain\b/i },
];

/**
 * Narrow Country fields merged onto the ESIM defaults in MySIMs wallet rows.
 */
export function deriveEsimCountryOverlay(planNameRaw: string): Pick<Country, 'id' | 'name' | 'countryCode' | 'flag'> | null {
  const planName = planNameRaw.trim().replace(/\s+/g, ' ');
  if (!planName) return null;

  for (const { code, matches } of REGION_HINTS) {
    if (!matches.test(planName)) continue;
    let name = code;
    try {
      name = REGION_NAMES_EN.of(code) ?? code;
    } catch {
      /* keep code */
    }
    return {
      id: code.toLowerCase(),
      name,
      countryCode: code,
      flag: '',
    };
  }
  return null;
}
