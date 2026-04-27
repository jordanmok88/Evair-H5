import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ShoppingBag, Truck, Shield } from 'lucide-react';
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
 * Two-step physical SIM purchase helper: pick card category (matches
 * catalogue / excel groupings), then open Amazon for the matching SKU.
 */
const AmazonPhysicalSimPicker: React.FC = () => {
    const { t } = useTranslation();
    const [family, setFamily] = useState<AmazonSimFamilyId | null>(null);
    const onExternal = useOpenExternalAmazon();

    return (
        <div className="relative rounded-2xl overflow-hidden shadow-sm mb-5 border border-slate-200 bg-white">
            <div className="p-5">
                <div className="flex items-start gap-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)' }}
                    >
                        <ShoppingBag size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.buy_on_amazon')}</h2>
                        <p className="text-sm text-slate-500 mt-1 leading-snug">{t('shop.buy_on_amazon_sub')}</p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                <Truck size={14} className="text-amber-500" /> {t('shop.amazon_prime')}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                <Shield size={14} className="text-amber-500" /> {t('shop.amazon_secure')}
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">{t('shop.amazon_picker_intro')}</p>

                <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label={t('shop.amazon_family_group_label')}>
                    {AMAZON_SIM_FAMILIES.map(({ id }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setFamily(id)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
                                family === id
                                    ? 'border-orange-400 bg-orange-50 text-orange-900'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {t(`amazonSim.family.${id}.title`)}
                        </button>
                    ))}
                </div>

                {family && (
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4" aria-live="polite">
                        <li className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                            {t(`amazonSim.family.${family}.subtitle`)}
                        </li>
                        {listingsForFamily(family).map(p => {
                            const href = buildAmazonUrlForProduct(p);
                            return (
                                <li
                                    key={p.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate">
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
                                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white text-xs font-bold px-3 py-2 active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        {t('amazonSim.view_on_amazon')}
                                        <ExternalLink size={12} aria-hidden />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <p className="text-[11px] text-slate-400 text-center mt-4">{t('shop.amazon_leave_notice')}</p>
            </div>
        </div>
    );
};

export default AmazonPhysicalSimPicker;
