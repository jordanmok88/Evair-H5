/** URL + i18n keys for the public marketing header (SiteHeader + apex marketing page). */

export type MarketingNavKey =
    | 'travel'
    | 'phone'
    | 'camera'
    | 'iot'
    | 'help'
    | 'blog';

export const MARKETING_NAV_ITEMS: readonly {
    key: MarketingNavKey;
    href: string;
    labelKey: `marketing.${string}`;
}[] = [
    { key: 'travel', href: '/travel-esim', labelKey: 'marketing.nav_local_travel_esim' },
    { key: 'phone', href: '/sim/phone', labelKey: 'marketing.nav_mobile' },
    { key: 'camera', href: '/sim/camera', labelKey: 'marketing.nav_camera_sim' },
    { key: 'iot', href: '/sim/iot', labelKey: 'marketing.nav_iot_sim' },
    { key: 'help', href: '/help', labelKey: 'marketing.nav_help' },
    { key: 'blog', href: '/blog', labelKey: 'marketing.nav_blog' },
] as const;
