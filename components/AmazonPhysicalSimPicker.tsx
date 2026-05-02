import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ExternalLink, ShoppingBag } from 'lucide-react';
import {
    AMAZON_SIM_FAMILIES,
    type AmazonSimFamilyId,
    buildAmazonUrlForProduct,
    listingsForFamily,
} from '../data/amazonPhysicalSimCatalog';

function useOpenExternalAmazon(): (url: string) => (e: React.MouseEvent) => void {
    return useCallback((url: string) => (e: React.MouseEvent) => {
        const evair = (window as unknown as { evair?: { isNative?: boolean; openExternal?: (u: string) => Promise<void> } })
            .evair;
        if (evair?.isNative && typeof evair.openExternal === 'function') {
            e.preventDefault();
            void evair.openExternal(url);
        }
    }, []);
}

/**
 * Physical SIM discovery: compact intro + three category tiles, then SKU list for the chosen family.
 */
const AmazonPhysicalSimPicker: React.FC = () => {
    const { t } = useTranslation();
    const [family, setFamily] = useState<AmazonSimFamilyId | null>(null);
    const onExternal = useOpenExternalAmazon();

    return (
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
                <header className="mb-4 flex gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)' }}
                        aria-hidden
                    >
                        <ShoppingBag size={22} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {t('shop.amazon_family_group_label')}
                        </p>
                        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{t('shop.buy_on_amazon')}</h2>
                        <p className="mt-1 text-sm leading-snug text-slate-600">{t('shop.amazon_picker_intro_short')}</p>
                    </div>
                </header>

                <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    role="group"
                    aria-label={t('shop.amazon_family_group_label')}
                >
                    {AMAZON_SIM_FAMILIES.map(({ id }) => {
                        const sel = family === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setFamily(sel ? null : id)}
                                aria-pressed={sel}
                                aria-expanded={sel}
                                className={`flex min-h-[5.75rem] flex-col items-start rounded-2xl border-2 px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:min-h-[6rem] sm:px-4 ${
                                    sel
                                        ? 'border-brand-orange bg-orange-50/60 shadow-sm shadow-orange-500/10'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]'
                                }`}
                            >
                                <span className="text-sm font-extrabold leading-snug text-slate-900">
                                    {t(`amazonSim.family.${id}.title`)}
                                </span>
                                <span className="mt-2 flex-1 text-[11px] font-medium leading-snug text-slate-500">
                                    {t(`amazonSim.family.${id}.subtitle`)}
                                </span>
                                <ChevronRight
                                    size={16}
                                    strokeWidth={2.5}
                                    className={`mt-2 shrink-0 text-slate-300 transition-transform ${sel ? 'rotate-90 text-brand-orange' : ''}`}
                                    aria-hidden
                                />
                            </button>
                        );
                    })}
                </div>

                {family && (
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4" aria-live="polite">
                        <li className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t(`amazonSim.family.${family}.subtitle`)}
                        </li>
                        {listingsForFamily(family).map((p) => {
                            const href = buildAmazonUrlForProduct(p);
                            return (
                                <li
                                    key={p.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-900">
                                            {t('amazonSim.plan_line', {
                                                gb: p.gbs,
                                                days: p.validityDays,
                                            })}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {t('amazonSim.from_price', { price: p.sellingPrice.toFixed(2) })}
                                        </div>
                                    </div>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={onExternal(href)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        {t('amazonSim.view_on_amazon')}
                                        <ExternalLink size={12} aria-hidden />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <p className="mt-5 text-center text-[11px] text-slate-400">{t('shop.amazon_leave_notice')}</p>
            </div>
        </div>
    );
};

export default AmazonPhysicalSimPicker;
