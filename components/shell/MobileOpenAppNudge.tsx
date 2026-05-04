import React from 'react';

/**
 * Legacy slot in app-shell headers ({@link ShopView}, {@link ProfileView}, etc.).
 *
 * **`OPEN APP`** only makes sense on **marketing** surfaces (people still on Safari / public pages).
 * The customer shell already *is* the app (`/app` or equivalent routes), so a second “OPEN APP” pill here
 * duplicated the headline CTA incorrectly (especially on phones).
 *
 * Keeps `<MobileOpenAppNudge />` call sites alive as a deliberate no-op for layout stability.
 */
export default function MobileOpenAppNudge() {
  return null;
}
