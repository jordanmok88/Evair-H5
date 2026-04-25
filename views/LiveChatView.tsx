/**
 * LiveChatView — full-screen real-time chat with a human agent.
 *
 * Sits on top of `useChat` (which owns conversation state, optimistic
 * sends, WS subscription, and polling fallback). This component is just
 * presentation:
 *
 *   - Header: agent name + WS status pill.
 *   - Message list: customer / agent bubbles, auto-scroll, rich types.
 *   - Composer: text input + image attach, with a retry affordance for
 *     failed sends.
 *
 * Rich message rendering follows CROSS_PLATFORM_CONTRACT §5.5:
 *   - text     → plain text bubble
 *   - image    → media_url rendered as <img>
 *   - order    → metadata.order_id / status / total — small card
 *   - product  → metadata.product_id / name / price — promotional card
 *
 * If the user opens this view without being logged in, the parent app
 * is responsible for routing them through the LoginModal first; we just
 * surface an "error" state if `useChat` boots into 401.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { useChat, LocalChatMessage } from '../hooks/useChat';

interface LiveChatViewProps {
  onBack: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Connecting…',
  loading: 'Connecting…',
  ready: 'Live',
  reconnecting: 'Reconnecting…',
  error: 'Offline',
};

/**
 * Render a single message bubble. Branches on `message_type` for rich
 * payloads. Customer messages right-align with brand colour; agent
 * messages left-align with grey.
 */
interface MessageBubbleProps {
  message: LocalChatMessage;
  onRetry: (clientMsgId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry }) => {
  const isMe = message.sender === 'customer';
  const isSystem = message.sender === 'system';
  const time = (() => {
    try {
      return new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    );
  }

  const bubbleClass = isMe
    ? 'bg-orange-500 text-white rounded-br-sm'
    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm';

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div>
            {message.media_url && (
              <img
                src={message.media_url}
                alt="attachment"
                className="rounded-lg max-h-64 object-contain"
              />
            )}
          </div>
        );
      case 'order': {
        const meta = (message.metadata ?? {}) as Record<string, unknown>;
        // Per CROSS_PLATFORM_CONTRACT §6.3 the canonical keys are
        // order_no / package_name / status / amount_cents / currency.
        // We keep tolerant fallbacks for legacy data.
        const orderNo = (meta.order_no as string) ?? (meta.order_id as string | number)?.toString() ?? '—';
        const packageName = (meta.package_name as string) ?? '';
        const status = (meta.status as string) ?? 'pending';
        const currency = (meta.currency as string) ?? 'USD';
        const amountCents = typeof meta.amount_cents === 'number'
          ? meta.amount_cents
          : typeof meta.amount === 'number'
            ? Math.round((meta.amount as number) * 100)
            : undefined;
        const totalLabel = amountCents !== undefined
          ? `${currency} ${(amountCents / 100).toFixed(2)}`
          : (meta.total as string | undefined);
        return (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide opacity-75">Order</div>
            <div className="font-semibold">#{orderNo}</div>
            {packageName && <div className="text-sm">{packageName}</div>}
            <div className="text-sm opacity-90">
              {status}
              {totalLabel ? ` · ${totalLabel}` : ''}
            </div>
          </div>
        );
      }
      case 'product': {
        const meta = (message.metadata ?? {}) as Record<string, unknown>;
        // Per CROSS_PLATFORM_CONTRACT §6.4: package_code / name /
        // price_cents / currency / location / duration_days / data_volume_gb.
        const name = (meta.name as string) ?? message.content;
        const packageCode = (meta.package_code as string) ?? (meta.product_id as string | number | undefined);
        const currency = (meta.currency as string) ?? 'USD';
        const priceCents = typeof meta.price_cents === 'number'
          ? meta.price_cents
          : typeof meta.price === 'number'
            ? Math.round((meta.price as number) * 100)
            : undefined;
        const priceLabel = priceCents !== undefined
          ? `${currency} ${(priceCents / 100).toFixed(2)}`
          : (meta.price as string | undefined);
        const location = meta.location as string | undefined;
        const dataGb = meta.data_volume_gb as number | undefined;
        const days = meta.duration_days as number | undefined;
        return (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide opacity-75">Plan</div>
            <div className="font-semibold">{name}</div>
            {priceLabel && <div className="text-sm">{priceLabel}</div>}
            {(location || dataGb || days) && (
              <div className="text-xs opacity-75">
                {[location, dataGb !== undefined ? `${dataGb}GB` : null, days !== undefined ? `${days}d` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
            {packageCode !== undefined && (
              <div className="text-[10px] opacity-60">{packageCode}</div>
            )}
          </div>
        );
      }
      case 'text':
      default:
        return <div className="whitespace-pre-wrap break-words">{message.content}</div>;
    }
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="max-w-[80%]">
        <div className={`px-3 py-2 rounded-2xl ${bubbleClass}`}>
          {renderContent()}
        </div>
        <div
          className={`flex items-center gap-1 mt-1 text-[10px] ${
            isMe ? 'justify-end text-slate-400' : 'text-slate-500'
          }`}
        >
          {message.isOptimistic && !message.failed && <Loader2 size={10} className="animate-spin" />}
          {message.failed && (
            <button
              onClick={() => message.client_msg_id && onRetry(message.client_msg_id)}
              className="flex items-center gap-1 text-red-500 underline-offset-2 hover:underline"
            >
              <RefreshCw size={10} /> Failed — retry
            </button>
          )}
          {!message.isOptimistic && !message.failed && <span>{time}</span>}
        </div>
      </div>
    </div>
  );
};

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
    retry,
    loadMore,
  } = useChat();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll behaviour. We have two competing goals:
  //   1. New messages → scroll to bottom (so the user sees them).
  //   2. Older messages prepended via loadMore() → preserve the
  //      currently-visible viewport (so the user doesn't get
  //      teleported back to the top).
  //
  // We capture the scroll height on every render via a ref, and on
  // the next render compare. If the height grew at the *top* (we
  // were near the top), we restore scrollTop = newHeight - oldHeight
  // so the user's anchor message stays at the same viewport position.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const wasNearTopRef = useRef<boolean>(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (wasNearTopRef.current) {
      // We just prepended older history. Restore the viewport so the
      // first previously-visible message stays in the same spot.
      const delta = scroller.scrollHeight - lastScrollHeightRef.current;
      if (delta > 0) {
        scroller.scrollTop = lastScrollTopRef.current + delta;
      }
      wasNearTopRef.current = false;
    } else {
      // Normal append: auto-scroll to bottom only when the user is
      // already close to it — otherwise we'd interrupt them reading
      // older history. Threshold: 100px from bottom.
      const distanceFromBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      if (distanceFromBottom < 100 || messages.length <= 1) {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    lastScrollHeightRef.current = scroller.scrollHeight;
  }, [messages]);

  // Scroll handler: trigger loadMore when the user is within ~80px of
  // the top. We snapshot the current scroll position before calling
  // loadMore so the post-prepend effect can restore it.
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

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendText(text);
    } catch {
      /* error surfaced as failed bubble — nothing to show inline */
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

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={onBack} aria-label="Back" className="p-1 -m-1 active:bg-slate-100 rounded-full">
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

      {/* Body */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3"
      >
        {loadingMore && (
          <div className="flex justify-center mb-2">
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
            <div className="text-sm">Connecting to support…</div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <WifiOff size={28} className="text-slate-400 mb-3" />
            <div className="font-semibold text-slate-900 mb-1">Couldn't reach support</div>
            <div className="text-sm text-slate-500 mb-4">
              {error?.message ?? 'Please check your internet connection and try again.'}
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm"
            >
              Go back
            </button>
          </div>
        )}

        {(status === 'ready' || status === 'reconnecting') && messages.length === 0 && (
          <div className="text-center text-sm text-slate-500 mt-12">
            {t('chat.empty', {
              defaultValue: "Hi! How can we help? Send a message below and an agent will join you.",
            })}
          </div>
        )}

        {messages.map(m => (
          <MessageBubble key={`${m.id}-${m.client_msg_id ?? ''}`} message={m} onRetry={retry} />
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      {(status === 'ready' || status === 'reconnecting') && (
        <div className="px-3 py-2 bg-white border-t border-slate-200 shrink-0 flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !conversation}
            className="p-2 -m-1 text-slate-500 active:bg-slate-100 rounded-full disabled:opacity-50"
            aria-label="Attach image"
          >
            <ImagePlus size={22} />
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
            className="flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2 max-h-32 focus:outline-none focus:border-orange-400"
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
    </div>
  );
}
