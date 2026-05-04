import React from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';

/** Single source of truth for the marketing / public-site “OPEN APP” header CTA. */
const OPEN_APP_HEADER_BTN_CLASS =
    'btn btn-primary !min-h-0 h-8 shrink-0 gap-1 rounded-full px-3 text-[10px] font-bold uppercase leading-none tracking-wide sm:h-9 sm:gap-1.5 sm:px-4 sm:text-xs md:h-[2.375rem] md:gap-2 md:px-4 md:text-sm';

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
            <Smartphone className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4 md:h-[1.05rem] md:w-[1.05rem]" strokeWidth={2.25} aria-hidden />
            <span className="whitespace-nowrap">{t('marketing.home_open_app')}</span>
        </a>
    );
};
