import React from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';

/** Single source of truth for the marketing / public-site “OPEN APP” header CTA. */
const OPEN_APP_HEADER_BTN_CLASS =
    'inline-flex h-7 shrink-0 select-none items-center justify-center gap-1 rounded-full bg-[#2563eb] px-2.5 text-[8px] font-bold uppercase leading-none tracking-wide text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.98] sm:h-8 sm:gap-1.5 sm:px-3.5 sm:text-[10px] md:h-9 md:gap-2 md:px-4 md:text-xs';

export interface OpenAppHeaderButtonProps {
    /** Defaults to the customer app shell. */
    href?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    className?: string;
}

/**
 * Blue pill + smartphone icon — use on every public page next to the wordmark
 * (Marketing home, `SiteHeader`, draft previews) so the CTA stays visually aligned.
 */
export const OpenAppHeaderButton: React.FC<OpenAppHeaderButtonProps> = ({ href = '/app', onClick, className = '' }) => {
    const { t } = useTranslation();
    const combined = [OPEN_APP_HEADER_BTN_CLASS, className].filter(Boolean).join(' ');
    return (
        <a
            href={href}
            onClick={onClick}
            className={combined}
            aria-label={t('marketing.home_open_app_aria')}
        >
            <Smartphone className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" strokeWidth={2.25} aria-hidden />
            <span className="whitespace-nowrap">{t('marketing.home_open_app')}</span>
        </a>
    );
};
