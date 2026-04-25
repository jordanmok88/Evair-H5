/**
 * ProductCardPicker — bottom sheet to attach a recharge package as a
 * chat message card.
 *
 * Ported from Ben's Flutter `_ProductCardPickerSheet`. Loads the
 * recharge package catalogue via `esimService.getPackages()` and lets
 * the user attach one to ask "is this plan available in <X>?" or
 * "what does this plan include?". The agent receives a structured
 * card rather than a free-form package code string.
 *
 * Selection only — sending the chat message is the parent's job.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Package, X } from 'lucide-react';
import { packageService } from '../../services/api/esim';
import type { PackageDto } from '../../services/api/types';

interface ProductCardPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (pkg: PackageDto) => void;
  /** If provided, scope the catalogue to a single location. */
  locationCode?: string;
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency || 'USD'} ${price.toFixed(2)}`;
  }
}

function formatVolume(bytesGb: number): string {
  if (!bytesGb || bytesGb <= 0) return '';
  if (bytesGb >= 1) return `${bytesGb}GB`;
  return `${Math.round(bytesGb * 1024)}MB`;
}

export default function ProductCardPicker({
  open,
  onClose,
  onPick,
  locationCode,
}: ProductCardPickerProps) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PackageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    packageService
      .getPackages({ locationCode, size: 30 })
      .then(res => {
        if (cancelled) return;
        setPackages(res.packages ?? []);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[ProductCardPicker] failed to load packages', err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locationCode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -top-1.5" />
          <h3 className="font-semibold text-slate-900 flex-1">
            {t('chat.attachProduct', { defaultValue: 'Attach a plan' })}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -m-1 active:bg-slate-100 rounded-full text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 size={20} className="animate-spin mb-2" />
              <div className="text-sm">{t('chat.loading', { defaultValue: 'Loading…' })}</div>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-10 px-6 text-sm text-slate-500">
              {error}
            </div>
          )}

          {!loading && !error && packages.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-500">
              {t('chat.noPackages', { defaultValue: 'No plans available right now.' })}
            </div>
          )}

          {!loading && !error && packages.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {packages.map(pkg => {
                const volume = formatVolume(pkg.volume);
                const duration =
                  pkg.duration > 0
                    ? `${pkg.duration}${pkg.durationUnit === 'MONTH' ? 'mo' : 'd'}`
                    : '';
                return (
                  <li key={pkg.packageCode}>
                    <button
                      onClick={() => onPick(pkg)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                        <Package size={18} className="text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate text-sm">
                          {pkg.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {[pkg.locationName, volume, duration].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-orange-600">
                          {formatPrice(pkg.price, pkg.currency)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
