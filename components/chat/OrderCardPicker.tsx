/**
 * OrderCardPicker — bottom sheet to attach a recent order as a chat
 * message card.
 *
 * Ported from Ben's Flutter `_OrderCardPickerSheet` (live_chat_page.dart).
 * Loads the user's orders via `orderService.getOrders()` and renders a
 * scrollable list. Tapping a row calls `onPick` with the chosen order;
 * the parent (LiveChatView) is responsible for sending the chat
 * message — this component just selects.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Receipt, X } from 'lucide-react';
import { orderService } from '../../services/api/order';
import type { OrderDto } from '../../services/api/types';

interface OrderCardPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (order: OrderDto) => void;
}

const STATUS_PALETTE: Record<string, { bg: string; fg: string; label: string }> = {
  // App tier uses lowercase statuses
  paid: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Paid' },
  completed: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Paid' },
  pending: { bg: 'bg-amber-50', fg: 'text-amber-700', label: 'Pending' },
  processing: { bg: 'bg-amber-50', fg: 'text-amber-700', label: 'Processing' },
  failed: { bg: 'bg-red-50', fg: 'text-red-700', label: 'Failed' },
  cancelled: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Cancelled' },
  refunded: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Refunded' },
  // Legacy uppercase statuses (backward compat)
  PAID: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Paid' },
  COMPLETED: { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Paid' },
  PENDING_PAYMENT: { bg: 'bg-amber-50', fg: 'text-amber-700', label: 'Pending' },
  PENDING: { bg: 'bg-amber-50', fg: 'text-amber-700', label: 'Pending' },
  PROCESSING: { bg: 'bg-amber-50', fg: 'text-amber-700', label: 'Processing' },
  FAILED: { bg: 'bg-red-50', fg: 'text-red-700', label: 'Failed' },
  CANCELLED: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Cancelled' },
  REFUNDED: { bg: 'bg-slate-100', fg: 'text-slate-600', label: 'Refunded' },
};

function formatStatus(status: string): { bg: string; fg: string; label: string } {
  // Try exact match first (App tier lowercase), then uppercase fallback
  return STATUS_PALETTE[status] ?? STATUS_PALETTE[(status || '').toUpperCase()]
    ?? { bg: 'bg-slate-100', fg: 'text-slate-600', label: status || 'Unknown' };
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'USD'} ${amount.toFixed(2)}`;
  }
}

export default function OrderCardPicker({ open, onClose, onPick }: OrderCardPickerProps) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    orderService
      .getOrders({ size: 20 })
      .then(res => {
        if (cancelled) return;
        setOrders(res.data ?? []);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[OrderCardPicker] failed to load orders', err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
            {t('chat.attachOrder', { defaultValue: 'Attach an order' })}
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

          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-500">
              {t('chat.noOrders', { defaultValue: "You don't have any orders yet." })}
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {orders.map(order => {
                const status = formatStatus(order.status);
                return (
                  <li key={order.id ?? order.orderNumber}>
                    <button
                      onClick={() => onPick(order)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Receipt size={18} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate text-sm">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          #{order.orderNumber}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-orange-600">
                          {formatAmount(order.amount, order.currency)}
                        </div>
                        <div
                          className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.bg} ${status.fg}`}
                        >
                          {status.label}
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
