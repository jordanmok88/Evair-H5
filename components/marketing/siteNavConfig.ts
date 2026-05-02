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
    /** Compact label for top headers (desktop/tablet). */
    labelKey: `marketing.${string}`;
    /** Fuller label for slim `SiteFooter` link row when set (e.g. “and” vs “&”). */
    footerLabelKey?: `marketing.${string}`;
}[] = [
    {
        key: 'travel',
        href: '/travel-esim',
        labelKey: 'marketing.nav_local_travel_esim_short',
        footerLabelKey: 'marketing.nav_local_travel_esim',
    },
    { key: 'phone', href: '/sim/phone', labelKey: 'marketing.nav_mobile' },
    { key: 'camera', href: '/sim/camera', labelKey: 'marketing.nav_camera_sim' },
    { key: 'iot', href: '/sim/iot', labelKey: 'marketing.nav_iot_sim' },
    { key: 'help', href: '/help', labelKey: 'marketing.nav_help' },
    { key: 'blog', href: '/blog', labelKey: 'marketing.nav_blog' },
] as const;
