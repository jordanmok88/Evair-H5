import type { TFunction } from 'i18next';
import type { ActiveSim } from '../types';

function isGenericPlaceLabel(name: string | undefined): boolean {
  const x = (name ?? '').trim().toLowerCase();
  return x === '' || x === 'travel esim' || x === 'global esim';
}

/**
 * Banner text on the shop header when the customer has linked eSIMs — must
 * reflect actual coverage (e.g. China) instead of always saying "Global eSIM".
 */
export function formatWalletEsimBannerLabel(sims: ActiveSim[], language: string, t: TFunction): string {
  const count = sims.length;
  if (count === 0) return '';

  const codes = [
    ...new Set(
      sims
        .map(s => (s.country?.countryCode ?? '').trim().toUpperCase())
        .filter(c => c.length === 2 && c !== 'XX'),
    ),
  ];

  let regionLabel: string | null = null;

  if (codes.length === 1) {
    const code = codes[0]!;
    const named = sims.find(
      s => (s.country?.countryCode ?? '').trim().toUpperCase() === code && !isGenericPlaceLabel(s.country?.name),
    );
    regionLabel = named?.country?.name?.trim() ?? null;
    if (!regionLabel) {
      try {
        regionLabel = new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? null;
      } catch {
        regionLabel = null;
      }
    }
  } else if (codes.length === 0) {
    const concreteNames = [
      ...new Set(
        sims.map(s => s.country?.name?.trim()).filter((n): n is string => Boolean(n) && !isGenericPlaceLabel(n)),
      ),
    ];
    if (concreteNames.length === 1) {
      regionLabel = concreteNames[0]!;
    }
  }

  if (regionLabel) {
    return count === 1
      ? String(t('shop.wallet_esim_country_one', { country: regionLabel }))
      : String(t('shop.wallet_esim_country_other', { count, country: regionLabel }));
  }

  return count === 1 ? String(t('shop.wallet_esim_generic_one')) : String(t('shop.wallet_esim_generic_other', { count }));
}
