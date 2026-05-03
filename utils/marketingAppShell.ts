/**
 * Marketing footer / hero CTAs redirect mobile users into the customer shell (`/app…`).
 * Absolute `https://evairdigital.com/app#…` URLs improve iOS Universal Links / Android
 * App Links hand-off to the native WebView shell when the app is installed.
 */
export function toAbsoluteAppShellUrl(relativeAppPath: string): string {
  if (typeof window === 'undefined') return relativeAppPath;
  if (!relativeAppPath.startsWith('/app')) return relativeAppPath;
  return `${window.location.origin}${relativeAppPath}`;
}
