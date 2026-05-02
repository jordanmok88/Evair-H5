import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronDown, Cpu, ExternalLink, Smartphone, type LucideIcon } from 'lucide-react';
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

const FAMILY_ICON: Record<AmazonSimFamilyId, LucideIcon> = {
    phone_tablet: Smartphone,
    trail_camera: Camera,
    iot_light: Cpu,
};

/**
 * Physical SIM → Amazon SKUs: full-width accordion rows so the shop reads correctly on narrow WebView widths.
 */
const AmazonPhysicalSimPicker: React.FC = () => {
    const { t } = useTranslation();
    const [family, setFamily] = useState<AmazonSimFamilyId | null>(null);
    const onExternal = useOpenExternalAmazon();

    return (
        <div>
            <div
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgb(15_23_42/0.06)]"
                role="group"
                aria-label={t('shop.amazon_family_group_label')}
            >
                <ul className="divide-y divide-slate-100">
                    {AMAZON_SIM_FAMILIES.map(({ id }) => {
                        const Icon = FAMILY_ICON[id];
                        const open = family === id;
                        return (
                            <li key={id} className="bg-white">
                                <button
                                    type="button"
                                    onClick={() => setFamily(open ? null : id)}
                                    aria-expanded={open}
                                    className={`flex w-full min-h-[4.75rem] items-center gap-3 px-4 py-3.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:gap-4 sm:px-4 sm:py-4 ${
                                        open ? 'bg-orange-50/80' : 'active:bg-slate-50 hover:bg-slate-50/80'
                                    }`}
                                >
                                    <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${
                                            open
                                                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/25'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                        aria-hidden
                                    >
                                        <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1 pr-2">
                                        <p className="text-[13px] font-semibold leading-snug text-slate-900 sm:text-sm">
                                            {t(`amazonSim.family.${id}.title`)}
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
                                            {t(`amazonSim.family.${id}.subtitle`)}
                                        </p>
                                    </div>
                                    <ChevronDown
                                        aria-hidden
                                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-brand-orange' : ''}`}
                                        strokeWidth={2.25}
                                    />
                                </button>

                                {open && (
                                    <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-4">
                                        <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {t('amazonSim.sku_section_title')}
                                        </p>
                                        <ul className="flex flex-col gap-2">
                                            {listingsForFamily(id).map((p) => {
                                                const href = buildAmazonUrlForProduct(p);
                                                return (
                                                    <li
                                                        key={p.id}
                                                        className="flex flex-col gap-2.5 rounded-xl border border-white bg-white px-3 py-3 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold leading-snug text-slate-900">
                                                                {t('amazonSim.plan_line', {
                                                                    gb: p.gbs,
                                                                    days: p.validityDays,
                                                                })}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-slate-500">
                                                                {t('amazonSim.from_price', { price: p.sellingPrice.toFixed(2) })}
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={onExternal(href)}
                                                            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition active:scale-[0.98] sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                                        >
                                                            {t('amazonSim.view_on_amazon')}
                                                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            <p className="mx-auto mt-4 max-w-sm text-center text-[11px] leading-relaxed text-slate-400">
                {t('shop.amazon_leave_notice')}
            </p>
        </div>
    );
};

export default AmazonPhysicalSimPicker;
