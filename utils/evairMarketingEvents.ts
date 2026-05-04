/** Dispatched from marketing chrome so App opens MarketingContactDrawer; listener skips when route is `/app`. */
export const EVAIR_OPEN_MARKETING_CONTACT_EVENT = 'evair-open-marketing-contact';

/** Edge tab / external CTAs → CustomerApp jumps to Dialer (#contact); only meaningful while `/app` is mounted. */
export const EVAIR_OPEN_APP_SHELL_CHAT = 'evair-open-app-shell-chat';
