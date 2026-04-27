import React from 'react';

/**
 * White-on-navy wordmark for marketing footers. Using HTML instead of
 * `/evairsim-wordmark.png` + `invert()` avoids filter quirks and uneven
 * transparent padding in the raster that can make “Evair” and the SIM
 * chip look vertically misaligned.
 */
export const FooterWordmarkLink: React.FC<{ className?: string }> = ({ className = '' }) => (
    <a
        href="/"
        aria-label="EvairSIM home"
        className={`group mb-3 inline-flex items-center gap-1.5 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] ${className}`}
    >
        <span className="text-2xl font-extrabold italic leading-none tracking-tight text-white sm:text-[1.75rem]">
            Evair
        </span>
        <span
            className="inline-flex h-7 min-w-[2.75rem] select-none items-center justify-center rounded border-2 border-white/95 px-1.5 text-xs font-extrabold tabular-nums leading-none text-white"
            aria-hidden
        >
            SIM
        </span>
    </a>
);
