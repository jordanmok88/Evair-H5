/**
 * Full calendar days remaining until the given ISO-like expiry instant.
 * Mirrors operator consoles that show "N days left" (ceil of wall-clock span).
 */
export function daysRemainingFromExpiry(expiryIso?: string | null): number | null {
  if (!expiryIso?.trim()) return null;
  const end = Date.parse(expiryIso.trim());
  if (Number.isNaN(end)) return null;
  const diffMs = end - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86400000);
}
