/**
 * SiteFooter — slim shared footer for every page except the apex
 * marketing home, which has its own richer 5-column sitemap layout.
 *
 * Kept deliberately flat (single row of links + brand mark) so it
 * doesn't compete with the page content on long-form surfaces like
 * help articles or blog posts.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MARKETING_NAV_ITEMS } from './siteNavConfig';

const SiteFooter: React.FC = () => {
    const { t } = useTranslation();
    const footerLinks = useMemo(
        () => [
            { label: t('marketing.footer_flat_home'), href: '/welcome' as const },
            ...MARKETING_NAV_ITEMS.map((item) => ({
                label: t(item.footerLabelKey ?? item.labelKey),
                href: `${item.href}` as const,
            })),
            { label: t('marketing.footer_flat_refunds'), href: '/legal/refund' as const },
            { label: t('marketing.footer_flat_support'), href: 'mailto:service@evairdigital.com' as const },
        ],
        [t],
    );

    return (
        <footer className="bg-slate-900 text-slate-400 px-4 md:px-8 py-8 text-sm">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src="/evairsim-wordmark.png"
                        alt="EvairSIM"
                        width={896}
                        height={228}
                        className="h-7 w-auto"
                    />
                    <span className="text-slate-500">·</span>
                    <span className="font-semibold text-white">Evair Digital</span>
                    <span>© {new Date().getFullYear()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center">
                    {footerLinks.map(link => (
                        <a key={`${link.label}-${link.href}`} href={link.href} className="hover:text-white">
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </footer>
    );
};

export default SiteFooter;
