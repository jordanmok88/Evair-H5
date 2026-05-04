/** Dispatched from marketing chrome so App opens MarketingContactDrawer; listener skips when route is `/app`. */
export const EVAIR_OPEN_MARKETING_CONTACT_EVENT = 'evair-open-marketing-contact';

/** Payload on {@link EVAIR_OPEN_MARKETING_CONTACT_EVENT} so the drawer sits beside the edge tab (`detail` optional → App uses defaults). */
export type MarketingContactOpenDetail = {
  dock: 'left' | 'right';
  /** Viewport Y of the tab’s top edge (px). */
  topPx: number;
  tabW: number;
  tabH: number;
};

/** Edge tab / external CTAs → CustomerApp jumps to Dialer (#contact); only meaningful while `/app` is mounted. */
export const EVAIR_OPEN_APP_SHELL_CHAT = 'evair-open-app-shell-chat';

/**
 * CustomerApp broadcasts whether the full-screen Contact / live chat (`Tab.DIALER`) is visible.
 * Consumers may include native WebView overlays; the HTML edge rail is not mounted on `/app`.
 */
export const EVAIR_APP_CONTACT_OPEN = 'evair-app-contact-open';
export type EvairAppContactOpenDetail = { open: boolean };
