/**
 * LiveChatView — full-screen real-time chat with a human agent.
 *
 * Sits on top of `useChat` (which owns conversation state, optimistic
 * sends, WS subscription, polling fallback, and pagination). This
 * component is presentation only.
 *
 * Visual structure:
 *
 *   ┌─ Header (back, agent name, WS pill) ─────────────────────────┐
 *   ├─ Status banner (green / orange / blue pill) ─────────────────┤
 *   ├─ Message list (paginated, grouped, with avatars + status) ──┤
 *   ├─ Error bar (only when send fails) ──────────────────────────┤
 *   └─ Composer (image / attach / textarea / send) ───────────────┘
 *
 * Most of the polish here was lifted from Ben's Flutter chat draft
 * (live_chat_page.dart, ~1800 lines) — message grouping, sender
 * avatars, time formatting, status banner, long-press copy, and the
 * order/product card pickers. We re-implemented the visuals in
 * Tailwind rather than copying Flutter widgets directly.
 *
 * Rich message rendering follows CROSS_PLATFORM_CONTRACT §6:
 *   - text     → plain text bubble
 *   - image    → media_url rendered as <img>, tap to open lightbox
 *   - order    → metadata.order_no / package_name / amount_cents card
 *   - product  → metadata.package_code / name / price_cents card
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Receipt,
  Package,
  X,
  Headphones,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { useChat, LocalChatMessage } from '../hooks/useChat';
import OrderCardPicker from '../components/chat/OrderCardPicker';
import ProductCardPicker from '../components/chat/ProductCardPicker';

interface LiveChatViewProps {
  onBack: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  idle: 'Connecting…',
  loading: 'Connecting…',
  ready: 'Live',
  reconnecting: 'Reconnecting…',
  error: 'Offline',
};

/**
 * Two messages should be visually grouped when:
 *   - Same sender (both customer or both agent),
 *   - Sent within 2 minutes of each other.
 * Grouped messages get tighter spacing and only the last in the group
 * shows the timestamp + delivery status.
 */
function shouldGroup(prev: LocalChatMessage, curr: LocalChatMessage): boolean {
  if (prev.sender !== curr.sender) return false;
  const dt = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return Math.abs(dt) < 2 * 60 * 1000;
}

/**
 * Friendly relative time. Today → HH:MM, yesterday → "Yesterday HH:MM",
 * older → "M/D HH:MM". Falls back to the raw timestamp on parse error
 * so we never crash the bubble render.
 */
function formatTime(iso: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  try {
    const when = new Date(iso);
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.floor((startOfDay(now) - startOfDay(when)) / 86400000);
    const hh = String(when.getHours()).padStart(2, '0');
    const mm = String(when.getMinutes()).padStart(2, '0');
    if (diffDays <= 0) return `${hh}:${mm}`;
    if (diffDays === 1) return `${t('chat.yesterday', { defaultValue: 'Yesterday' })} ${hh}:${mm}`;
    return `${when.getMonth() + 1}/${when.getDate()} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

// ─── small inline components ─────────────────────────────────────────────

/**
 * Message delivery status icon (shown only on customer-sent messages,
 * only on the last message in a group). Three states only — `read`
 * and `delivered` aren't yet broadcast by Laravel.
 */
function MessageStatusIcon({ message, mine }: { message: LocalChatMessage; mine: boolean }) {
  if (!mine) return null;
  if (message.failed) return null; // failed state owns the row, no status icon needed
  if (message.isOptimistic) {
    return <Loader2 size={11} className="animate-spin opacity-70" />;
  }
  // Single-check (sent) — Laravel doesn't send delivered/read yet, so we
  // stop at "sent" once the server confirms.
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="opacity-70">
      <path
        d="M1 5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Conversation status pill — derives label + colour from
 * `conversation.status` so the user knows whether they're talking to
 * a queue, a live agent, or have a closed ticket.
 */
function StatusBanner({ status, t }: { status?: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const normalised = (status ?? 'open').toLowerCase();
  const variant = (() => {
    if (normalised === 'resolved' || normalised === 'closed') {
      return {
        label: t('chat.statusResolved', { defaultValue: 'Resolved' }),
        bg: 'bg-emerald-50',
        fg: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    }
    if (normalised === 'needs_agent') {
      return {
        label: t('chat.statusAgentOnTheWay', { defaultValue: 'Agent is on the way' }),
        bg: 'bg-amber-50',
        fg: 'text-amber-700',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: t('chat.statusAgentsOnline', { defaultValue: 'Agents online' }),
      bg: 'bg-sky-50',
      fg: 'text-sky-700',
      dot: 'bg-sky-500',
    };
  })();

  return (
    <div className="flex justify-center pt-2 pb-1 px-3 shrink-0">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${variant.bg} ${variant.fg}`}
      >
        <span className={`w-2 h-2 rounded-full ${variant.dot}`} />
        {variant.label}
      </div>
    </div>
  );
}

// ─── rich content renderers ─────────────────────────────────────────────

function OrderCardContent({ message, mine }: { message: LocalChatMessage; mine: boolean }) {
  const meta = (message.metadata ?? {}) as Record<string, unknown>;
  const orderNo = (meta.order_no as string) ?? (meta.order_id as string | number | undefined)?.toString() ?? '';
  const packageName = (meta.package_name as string) ?? '';
  const status = (meta.status as string) ?? 'pending';
  const currency = (meta.currency as string) ?? 'USD';
  const amountCents =
    typeof meta.amount_cents === 'number'
      ? meta.amount_cents
      : typeof meta.amount === 'number'
        ? Math.round((meta.amount as number) * 100)
        : undefined;

  const statusLabel = (() => {
    const upper = (status || '').toUpperCase();
    if (upper.includes('PAID') || upper === 'COMPLETED') return 'Paid';
    if (upper.includes('PENDING')) return 'Pending';
    if (upper.includes('FAIL')) return 'Failed';
    if (upper.includes('CANCEL') || upper === 'REFUNDED') return 'Cancelled';
    return upper || 'Unknown';
  })();
  const statusClass = (() => {
    if (statusLabel === 'Paid') return 'bg-emerald-100 text-emerald-700';
    if (statusLabel === 'Pending') return 'bg-amber-100 text-amber-700';
    if (statusLabel === 'Failed') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  })();

  const amountLabel =
    amountCents !== undefined
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(
          amountCents / 100,
        )
      : null;

  return (
    <div className={`min-w-[200px] rounded-lg p-3 ${mine ? 'bg-white/15' : 'bg-slate-50'}`}>
      {packageName && (
        <div className={`font-semibold text-sm mb-1 ${mine ? 'text-white' : 'text-slate-900'}`}>
          {packageName}
        </div>
      )}
      {orderNo && (
        <div className="flex items-center gap-1 mb-2">
          <Receipt size={12} className={mine ? 'text-white/70' : 'text-slate-500'} />
          <span className={`text-[11px] truncate ${mine ? 'text-white/80' : 'text-slate-500'}`}>{orderNo}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusClass}`}>
          {statusLabel}
        </span>
        {amountLabel && (
          <span className={`text-sm font-bold ${mine ? 'text-white' : 'text-orange-600'}`}>
            {amountLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function ProductCardContent({ message, mine }: { message: LocalChatMessage; mine: boolean }) {
  const meta = (message.metadata ?? {}) as Record<string, unknown>;
  const name = (meta.name as string) ?? message.content;
  const packageCode = (meta.package_code as string) ?? '';
  const currency = (meta.currency as string) ?? 'USD';
  const priceCents =
    typeof meta.price_cents === 'number'
      ? meta.price_cents
      : typeof meta.price === 'number'
        ? Math.round((meta.price as number) * 100)
        : undefined;
  const location = (meta.location as string) ?? (meta.location_name as string) ?? '';
  const dataGb = meta.data_volume_gb as number | undefined;
  const days = meta.duration_days as number | undefined;

  const priceLabel =
    priceCents !== undefined
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(
          priceCents / 100,
        )
      : null;

  return (
    <div className={`min-w-[200px] rounded-lg p-3 ${mine ? 'bg-white/15' : 'bg-slate-50'}`}>
      <div className={`font-semibold text-sm mb-1 ${mine ? 'text-white' : 'text-slate-900'}`}>
        {name}
      </div>
      {(location || dataGb !== undefined || days !== undefined) && (
        <div className={`text-[11px] mb-2 ${mine ? 'text-white/80' : 'text-slate-500'}`}>
          {[location, dataGb !== undefined ? `${dataGb}GB` : null, days !== undefined ? `${days}d` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {packageCode && (
          <span className={`text-[10px] font-mono truncate ${mine ? 'text-white/70' : 'text-slate-400'}`}>
            {packageCode}
          </span>
        )}
        {priceLabel && (
          <span className={`text-sm font-bold ml-auto ${mine ? 'text-white' : 'text-orange-600'}`}>
            {priceLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── message bubble (with grouping) ─────────────────────────────────────

interface MessageBubbleProps {
  message: LocalChatMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onRetry: (clientMsgId: string) => void;
  onLongPress: (message: LocalChatMessage, anchor: { x: number; y: number }) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isFirstInGroup,
  isLastInGroup,
  onRetry,
  onLongPress,
}) => {
  const { t } = useTranslation();
  const mine = message.sender === 'customer';
  const isSystem = message.sender === 'system';
  const isAi = message.sender === 'ai';
  const longPressTimer = useRef<number | null>(null);

  // Long-press detection: 500ms touch / mouse hold opens the context
  // menu. We cancel on move or release before the threshold so a
  // normal scroll/tap doesn't trigger it.
  const startLongPress = useCallback(
    (clientX: number, clientY: number) => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      longPressTimer.current = window.setTimeout(() => {
        onLongPress(message, { x: clientX, y: clientY });
      }, 500);
    },
    [message, onLongPress],
  );
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  // Bubble background — customer (orange), AI (purple-ish), agent (white).
  const bubbleBg = mine
    ? 'bg-orange-500 text-white'
    : isAi
      ? 'bg-violet-50 text-slate-900 border border-violet-100'
      : 'bg-white text-slate-900 border border-slate-200';

  // Corner radius — grouped tail messages get a sharp inner corner
  // (modern messenger UI convention).
  const radiusClass = mine
    ? isLastInGroup
      ? 'rounded-2xl rounded-br-md'
      : 'rounded-2xl'
    : isLastInGroup
      ? 'rounded-2xl rounded-bl-md'
      : 'rounded-2xl';

  // Vertical padding shrinks for grouped middle messages.
  const padClass = isFirstInGroup && isLastInGroup
    ? 'px-3 py-2'
    : isFirstInGroup
      ? 'px-3 pt-2 pb-1.5'
      : isLastInGroup
        ? 'px-3 pt-1.5 pb-2'
        : 'px-3 py-1.5';

  // Margin between groups vs within groups.
  const wrapperMargin = `${isFirstInGroup ? 'mt-3' : 'mt-0.5'} ${isLastInGroup ? 'mb-3' : 'mb-0.5'}`;

  const senderLabel =
    !mine && isFirstInGroup
      ? message.sender_name ?? (isAi ? 'AI assistant' : 'Support')
      : null;
  const avatarUrl = message.sender_admin?.avatar ?? null;

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return message.media_url ? (
          <img
            src={message.media_url}
            alt="attachment"
            className="rounded-lg max-h-64 max-w-full object-contain"
          />
        ) : null;
      case 'order':
        return <OrderCardContent message={message} mine={mine} />;
      case 'product':
        return <ProductCardContent message={message} mine={mine} />;
      case 'text':
      default:
        return <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>;
    }
  };

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${wrapperMargin}`}>
      {/* Agent avatar (only on first in group, on the left) */}
      {!mine && (
        <div className="w-7 mr-2 shrink-0 flex items-end">
          {isFirstInGroup ? (
            avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                <Headphones size={13} className="text-orange-500" />
              </div>
            )
          ) : null}
        </div>
      )}

      <div className="max-w-[78%] flex flex-col">
        {/* Sender label only on first in group */}
        {senderLabel && (
          <div className="text-[10px] text-slate-400 mb-0.5 ml-1">
            {senderLabel}
            {isAi ? ' (AI)' : ''}
          </div>
        )}

        <div
          className={`${padClass} ${radiusClass} ${bubbleBg} select-none`}
          onTouchStart={e => {
            const touch = e.touches[0];
            startLongPress(touch.clientX, touch.clientY);
          }}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onMouseDown={e => startLongPress(e.clientX, e.clientY)}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onContextMenu={e => {
            e.preventDefault();
            onLongPress(message, { x: e.clientX, y: e.clientY });
          }}
        >
          {renderContent()}
        </div>

        {/* Timestamp + status — only on last in group */}
        {isLastInGroup && (
          <div
            className={`flex items-center gap-1 mt-0.5 text-[10px] ${
              mine ? 'justify-end text-slate-400' : 'text-slate-400 ml-1'
            }`}
          >
            {message.failed && message.client_msg_id ? (
              <button
                onClick={() => onRetry(message.client_msg_id!)}
                className="flex items-center gap-1 text-red-500 underline-offset-2 hover:underline"
              >
                <RefreshCw size={10} /> {t('chat.failedRetry', { defaultValue: 'Failed — tap to retry' })}
              </button>
            ) : (
              <>
                <span>{formatTime(message.created_at, t)}</span>
                <span className="text-orange-300">
                  <MessageStatusIcon message={message} mine={mine} />
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right-side spacer for symmetric width; keeps customer bubbles
          aligned to the same right edge regardless of avatar presence. */}
      {mine && <div className="w-2 shrink-0" />}
    </div>
  );
};

// ─── attach menu (image / order / product) ─────────────────────────────

interface AttachMenuProps {
  open: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickOrder: () => void;
  onPickProduct: () => void;
}

function AttachMenu({ open, onClose, onPickImage, onPickOrder, onPickProduct }: AttachMenuProps) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-xl p-2"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2" />
        <button
          onClick={onPickImage}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg active:bg-slate-50"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <ImagePlus size={18} className="text-violet-500" />
          </div>
          <span className="text-sm text-slate-900">
            {t('chat.attachImage', { defaultValue: 'Image' })}
          </span>
        </button>
        <button
          onClick={onPickOrder}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg active:bg-slate-50"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Receipt size={18} className="text-orange-500" />
          </div>
          <span className="text-sm text-slate-900">
            {t('chat.attachOrder', { defaultValue: 'Order' })}
          </span>
        </button>
        <button
          onClick={onPickProduct}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg active:bg-slate-50"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <Package size={18} className="text-sky-500" />
          </div>
          <span className="text-sm text-slate-900">
            {t('chat.attachProduct', { defaultValue: 'Plan' })}
          </span>
        </button>
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── main view ─────────────────────────────────────────────────────────

export default function LiveChatView({ onBack }: LiveChatViewProps) {
  const { t } = useTranslation();
  useEdgeSwipeBack(onBack);

  const {
    conversation,
    messages,
    status,
    error,
    hasMore,
    loadingMore,
    sendText,
    sendImage,
    sendOrderCard,
    sendProductCard,
    retry,
    loadMore,
  } = useChat();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Sheets state — only one open at a time.
  const [sheet, setSheet] = useState<'none' | 'attach' | 'order' | 'product'>('none');

  // Long-press context menu (Copy / Save image).
  const [contextMenu, setContextMenu] = useState<{
    message: LocalChatMessage;
    x: number;
    y: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Image lightbox — tap an image bubble to view full-screen.
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Pre-compute grouping flags so the bubble renderer doesn't have to
  // peek at neighbours each render.
  const enrichedMessages = useMemo(() => {
    return messages.map((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      const groupedWithPrev = !!prev && shouldGroup(prev, m);
      const groupedWithNext = !!next && shouldGroup(m, next);
      return {
        message: m,
        isFirstInGroup: !groupedWithPrev,
        isLastInGroup: !groupedWithNext,
      };
    });
  }, [messages]);

  // Auto-scroll behaviour. Two modes:
  //   1. New messages → scroll to bottom (when user is already near it).
  //   2. Older messages prepended via loadMore() → preserve viewport.
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const wasNearTopRef = useRef<boolean>(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (wasNearTopRef.current) {
      const delta = scroller.scrollHeight - lastScrollHeightRef.current;
      if (delta > 0) {
        scroller.scrollTop = lastScrollTopRef.current + delta;
      }
      wasNearTopRef.current = false;
    } else {
      const distanceFromBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      if (distanceFromBottom < 100 || messages.length <= 1) {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    lastScrollHeightRef.current = scroller.scrollHeight;
  }, [messages]);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (scroller.scrollTop <= 80 && hasMore && !loadingMore) {
      lastScrollHeightRef.current = scroller.scrollHeight;
      lastScrollTopRef.current = scroller.scrollTop;
      wasNearTopRef.current = true;
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  // ─── send handlers ─────────────────────────────────────────────────

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendText(text);
    } catch {
      /* surfaced as failed bubble */
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      await sendImage(file);
    } catch (err) {
      console.warn('[LiveChatView] image send failed', err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLongPress = useCallback(
    (message: LocalChatMessage, anchor: { x: number; y: number }) => {
      // If it's an image bubble, prefer opening the lightbox over the
      // context menu — the user almost always wants to see the photo.
      if (message.message_type === 'image' && message.media_url) {
        setLightbox(message.media_url);
        return;
      }
      setContextMenu({ message, x: anchor.x, y: anchor.y });
    },
    [],
  );

  const handleCopy = async () => {
    if (!contextMenu) return;
    const text = contextMenu.message.content;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older WebViews that don't expose the async API.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setToast(t('chat.copied', { defaultValue: 'Copied' }));
    } catch (err) {
      console.warn('[LiveChatView] copy failed', err);
    } finally {
      setContextMenu(null);
    }
  };

  // ─── render ────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={onBack}
          aria-label="Back"
          className="p-1 -m-1 active:bg-slate-100 rounded-full"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900">
            {t('chat.title', { defaultValue: 'Evair Support' })}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            {status === 'ready' ? (
              <Wifi size={12} className="text-emerald-500" />
            ) : (
              <WifiOff size={12} className="text-slate-400" />
            )}
            {STATUS_LABEL[status] ?? status}
          </div>
        </div>
      </div>

      {/* Conversation status pill — only when ready */}
      {(status === 'ready' || status === 'reconnecting') && (
        <StatusBanner status={conversation?.status} t={t} />
      )}

      {/* Body */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 pt-1 pb-3"
      >
        {loadingMore && (
          <div className="flex justify-center my-2">
            <Loader2 size={14} className="animate-spin text-slate-400" />
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <div className="flex justify-center mb-2">
            <div className="text-[10px] text-slate-400">
              {t('chat.startOfHistory', { defaultValue: 'Beginning of conversation' })}
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Loader2 size={20} className="animate-spin mb-2" />
            <div className="text-sm">
              {t('chat.connecting', { defaultValue: 'Connecting to support…' })}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <WifiOff size={28} className="text-slate-400 mb-3" />
            <div className="font-semibold text-slate-900 mb-1">
              {t('chat.errorTitle', { defaultValue: "Couldn't reach support" })}
            </div>
            <div className="text-sm text-slate-500 mb-4">
              {error?.message ??
                t('chat.errorBody', {
                  defaultValue: 'Please check your internet connection and try again.',
                })}
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm"
            >
              {t('chat.goBack', { defaultValue: 'Go back' })}
            </button>
          </div>
        )}

        {(status === 'ready' || status === 'reconnecting') && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-orange-500" />
            </div>
            <div className="font-bold text-slate-900 mb-1">
              {t('chat.emptyTitle', { defaultValue: 'How can we help?' })}
            </div>
            <div className="text-sm text-slate-500 leading-relaxed">
              {t('chat.emptyHint', {
                defaultValue: 'Send a message and an agent will join you in a moment.',
              })}
            </div>
          </div>
        )}

        {enrichedMessages.map(({ message, isFirstInGroup, isLastInGroup }) => (
          <MessageBubble
            key={`${message.id}-${message.client_msg_id ?? ''}`}
            message={message}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            onRetry={retry}
            onLongPress={handleLongPress}
          />
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      {(status === 'ready' || status === 'reconnecting') && (
        <div className="px-3 py-2 bg-white border-t border-slate-200 shrink-0 flex items-end gap-2">
          <button
            onClick={() => setSheet('attach')}
            disabled={sending || !conversation}
            className="p-2 -m-1 text-slate-500 active:bg-slate-100 rounded-full disabled:opacity-50"
            aria-label="Attach"
          >
            <Plus size={22} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={t('chat.composerPlaceholder', { defaultValue: 'Type a message…' })}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2 max-h-32 focus:outline-none focus:border-orange-400 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim() || !conversation}
            aria-label="Send"
            className="p-2 rounded-full bg-orange-500 text-white disabled:bg-slate-300"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      )}

      {/* Sheets */}
      <AttachMenu
        open={sheet === 'attach'}
        onClose={() => setSheet('none')}
        onPickImage={() => {
          setSheet('none');
          fileInputRef.current?.click();
        }}
        onPickOrder={() => setSheet('order')}
        onPickProduct={() => setSheet('product')}
      />
      <OrderCardPicker
        open={sheet === 'order'}
        onClose={() => setSheet('none')}
        onPick={async order => {
          setSheet('none');
          setSending(true);
          try {
            await sendOrderCard({
              orderNo: order.orderNumber,
              packageName: order.orderNumber, // App tier OrderDto has no packageName; use orderNumber
              status: order.status,
              amount: order.amount,
              currency: order.currency,
            });
          } catch (err) {
            console.warn('[LiveChatView] sendOrderCard failed', err);
          } finally {
            setSending(false);
          }
        }}
      />
      <ProductCardPicker
        open={sheet === 'product'}
        onClose={() => setSheet('none')}
        onPick={async pkg => {
          setSheet('none');
          setSending(true);
          try {
            await sendProductCard({
              packageCode: pkg.packageCode,
              name: pkg.name,
              price: pkg.price,
              currency: pkg.currency,
              location: pkg.locationName,
              durationDays:
                pkg.durationUnit === 'MONTH'
                  ? pkg.duration * 30
                  : pkg.duration,
              dataVolumeGb: pkg.volume,
            });
          } catch (err) {
            console.warn('[LiveChatView] sendProductCard failed', err);
          } finally {
            setSending(false);
          }
        }}
      />

      {/* Long-press context menu (positioned at the touch point) */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 80),
            }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.message.message_type !== 'image' && contextMenu.message.content && (
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 active:bg-slate-50"
              >
                <Copy size={14} />
                {t('chat.copy', { defaultValue: 'Copy' })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <img
            src={lightbox}
            alt="preview"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
