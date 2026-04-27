import React from 'react';

/**
 * Brand wordmark in marketing footers — same raster as `SiteHeader` /
 * `SiteFooter` (`/evairsim-wordmark.png`), not a CSS text recreation.
 */
export const FooterWordmarkLink: React.FC<{ className?: string }> = ({ className = '' }) => (
    <a
        href="/"
        aria-label="EvairSIM home"
        className={`group mb-3 inline-flex max-w-full items-center no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] ${className}`}
    >
        <img
            src="/evairsim-wordmark.png"
            alt="EvairSIM"
            width={896}
            height={228}
            className="h-8 w-auto sm:h-9"
            decoding="async"
        />
    </a>
);
