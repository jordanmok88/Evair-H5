/**
 * Session cache of a desktop travel-eSIM checkout success screen.
 *
 * The LPA string and activation code in this blob install the eSIM once.
 * Keep them only so a refresh of the same country page can show the QR
 * again. A later visit (another country, the catalogue, or a new login
 * session) must not replay them.
 */

export const ESIM_CHECKOUT_SUCCESS_CACHE_KEY = 'esim_checkout_last_success';

export type CheckoutNavigationKind = 'navigate' | 'reload' | 'back_forward' | 'prerender' | 'unknown';

export function readCheckoutNavigationKind(nav: { type?: string } | null | undefined): CheckoutNavigationKind {
  const kind = nav?.type;
  if (kind === 'reload' || kind === 'navigate' || kind === 'back_forward' || kind === 'prerender') {
    return kind;
  }
  return 'unknown';
}

export function checkoutCountriesMatch(
  snapCountry: string | null | undefined,
  activeCountry: string | null | undefined,
): boolean {
  if (!snapCountry || !activeCountry) return false;
  return snapCountry.trim().toLowerCase() === activeCountry.trim().toLowerCase();
}

/**
 * Fresh document loads that are not a refresh of the success page should
 * drop the cached install secrets. The Stripe return itself is excluded:
 * that load still has `stripe_status=success` and writes a new snapshot.
 */
export function shouldDiscardCheckoutSuccess(
  nav: CheckoutNavigationKind,
  stripeStatus: string | null,
): boolean {
  if (stripeStatus === 'success') return false;
  return nav === 'navigate' || nav === 'prerender' || nav === 'unknown';
}

/** Restore the QR only when the buyer refreshes the country page that sold it. */
export function shouldRestoreCheckoutSuccess(
  nav: CheckoutNavigationKind,
  stripeStatus: string | null,
  snapCountry: string | null | undefined,
  activeCountry: string | null | undefined,
): boolean {
  if (stripeStatus) return false;
  if (nav !== 'reload' && nav !== 'back_forward') return false;
  return checkoutCountriesMatch(snapCountry, activeCountry);
}

export function clearEsimCheckoutSuccessCache(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(ESIM_CHECKOUT_SUCCESS_CACHE_KEY);
  } catch {
    /* private mode */
  }
}
