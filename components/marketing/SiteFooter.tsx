/**
 * SiteFooter — slim shared footer for every page except the apex
 * marketing home, which has its own richer 5-column sitemap layout.
 *
 * Kept deliberately flat (single row of links + brand mark) so it
 * doesn't compete with the page content on long-form surfaces like
 * help articles or blog posts.
 */

import React from 'react';

const FOOTER_LINKS: { label: string; href: string }[] = [
    { label: 'Home', href: '/welcome' },
    { label: 'Phone', href: '/sim/phone' },
    { label: 'Camera', href: '/sim/camera' },
    { label: 'IoT', href: '/sim/iot' },
    { label: 'Travel eSIM', href: '/travel-esim' },
    { label: 'Help', href: '/help' },
    { label: 'Blog', href: '/blog' },
    { label: 'Refunds', href: '/legal/refund' },
    { label: 'Support', href: 'mailto:service@evairdigital.com' },
];

const SiteFooter: React.FC = () => (
    <footer className="bg-slate-900 text-slate-400 px-4 md:px-8 py-8 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-amber-400" />
                <span className="font-semibold text-white">Evair Digital</span>
                <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center">
                {FOOTER_LINKS.map(link => (
                    <a key={link.href} href={link.href} className="hover:text-white">
                        {link.label}
                    </a>
                ))}
            </div>
        </div>
    </footer>
);

export default SiteFooter;
