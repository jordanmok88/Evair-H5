import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Paperclip, CheckCheck, Bot, Sparkles, AlertCircle, ArrowDown, Wifi, WifiOff, Headphones, ImagePlus, FileText, Loader2, X, Package, Receipt, Download, MoreVertical } from 'lucide-react';
import { getMultilingualResponse } from '../ai/evairAssistant';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { chatService, newClientMsgId } from '../services/api/chat';
import {
  acquireSharedChatProvider,
  createChatProvider,
  releaseSharedChatProvider,
  type ChatProvider,
  type ConnectionState,
  type UnifiedChatMessage,
} from '../services/chat';


interface ContactUsViewProps {
  onBack: () => void;
  userName?: string;
  /** When known (logged-in `/app`), pre-fills the Leave a message capture flow. */
  customerEmail?: string | null;
  /** Marketing slide-over / sheet: constrain height instead of forcing full viewport scroll */
  embedded?: boolean;
}

/** Edge swipe ignores the bottom strip so the composer is not mistaken for a back gesture */
const EDGE_SWIPE_EXCLUDE_BOTTOM_PX = 140;

const HUMAN_KEYWORDS = /\b(human|agent|real person|speak to someone|talk to person|live chat|representative|operator|transfer)\b|人工|客服|真人|转接|找人|humano|agente|persona real/i;

/** Quick-topic chips aligned with `ai/evairAssistant.ts` knowledge (no eCard). */
const COMPOSER_SUGGESTION_KEYS = [
  'network_problem',
  'sim_activation',
  'install_esim',
  'iccid_help',
  'device_compatibility',
  'data_topup',
  'plans_pricing',
  'coverage_roaming',
  'billing_issue',
  'refund_help',
  'shipping_sim',
  'plan_validity',
] as const;

const SUGGESTION_AI_QUERY: Record<(typeof COMPOSER_SUGGESTION_KEYS)[number], string> = {
  network_problem: 'My eSIM is not working, no signal or internet',
  sim_activation: 'How do I activate my SIM card?',
  install_esim: 'How do I install my eSIM using the QR code?',
  iccid_help: 'Where do I find my ICCID number on my SIM?',
  device_compatibility: 'Is my phone compatible with Evair eSIM?',
  data_topup: 'How can I top up my data plan?',
  plans_pricing: 'What are your data plan prices and discounts?',
  coverage_roaming: 'Which countries does EvairSIM cover for roaming?',
  billing_issue: 'I have a billing question about my payment',
  refund_help: 'What is your refund policy?',
  shipping_sim: 'How long does shipping take for a physical SIM card?',
  plan_validity: 'When does my plan validity period start and expire?',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uniqSuggestionKeys(keys: readonly (typeof COMPOSER_SUGGESTION_KEYS)[number][]): (typeof COMPOSER_SUGGESTION_KEYS)[number][] {
  const seen = new Set<string>();
  const out: (typeof COMPOSER_SUGGESTION_KEYS)[number][] = [];
  for (const k of keys) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** URL-driven quick prompts (pricing, activation funnel, SEO landers). */
function contextualSuggestionsFromPath(path: string): (typeof COMPOSER_SUGGESTION_KEYS)[number][] {
  const p = path.toLowerCase();
  const hit: (typeof COMPOSER_SUGGESTION_KEYS)[number][] = [];
  if (p.includes('top-up') || p.includes('topup') || p.includes('/pricing') || p.includes('/plans')) {
    hit.push('billing_issue', 'data_topup');
  }
  if (p.includes('activate')) {
    hit.push('sim_activation', 'shipping_sim');
  }
  if (p.includes('travel-esim')) {
    hit.push('coverage_roaming', 'plans_pricing', 'install_esim');
  }
  if (p.includes('/legal') || p.includes('refund')) {
    hit.push('refund_help');
  }
  if (p.includes('/device') || p.includes('/sim/')) {
    hit.push('device_compatibility', 'network_problem');
  }
  return uniqSuggestionKeys(hit);
}

const DRAFT_KEY = 'evair-chat-draft';
const SCROLL_FOLLOW_THRESHOLD_PX = 80;
const COMPOSER_MIN_INPUT_PX = 44;
const COMPOSER_MAX_INPUT_PX = 132;

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDateLabel = (d: Date, t: (k: string) => string): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return t('contact.date_today');
  if (sameDay(d, yesterday)) return t('contact.date_yesterday');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: today.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
};

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Parse amount from metadata — handles "29.9900" strings, amount_cents, and raw numbers */
const parseAmount = (meta: Record<string, unknown>, key = 'amount'): { cents: number; currency: string } => {
  const currency = (meta.currency as string) ?? 'USD';
  const raw = meta[key];
  const rawCents = meta.amount_cents;
  if (typeof rawCents === 'number') return { cents: rawCents, currency };
  if (typeof raw === 'number') return { cents: Math.round(raw * 100), currency };
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return { cents: Math.round(parsed * 100), currency };
  }
  return { cents: 0, currency };
};

const formatAmountCents = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100);

const RichText = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {i > 0 && <br />}
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </span>
        );
      })}
    </>
  );
};

const ContactUsView: React.FC<ContactUsViewProps> = ({
  onBack,
  userName = 'Jordan',
  customerEmail,
  embedded = false,
}) => {
  const { t } = useTranslation();
  useEdgeSwipeBack(onBack, { excludeBottomPx: EDGE_SWIPE_EXCLUDE_BOTTOM_PX });
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [input, setInput] = useState<string>(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });
  const [isTyping, setIsTyping] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [detailSheet, setDetailSheet] = useState<{
    type: 'product' | 'order';
    meta: Record<string, unknown>;
  } | null>(null);

  // Phase 1: aiDisabled replaces showLiveChat
  const [aiDisabled, setAiDisabled] = useState(false);
  const aiDisabledRef = useRef(false);

  // Phase 2: upload state
  const [uploading, setUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [liveStaffModalOpen, setLiveStaffModalOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  const [initializingChat, setInitializingChat] = useState(true);

  const [leaveMessageMode, setLeaveMessageMode] = useState(false);
  const [leaveEmailInput, setLeaveEmailInput] = useState(() => (customerEmail?.trim() ?? ''));
  const [leaveEmailError, setLeaveEmailError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<{ emailConfirmed: boolean; email: string } | null>(null);

  // Phase 4: loading history + infinite scroll up
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const providerRef = useRef<ChatProvider | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // 草稿持久化
  useEffect(() => {
    try {
      if (input) localStorage.setItem(DRAFT_KEY, input);
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
  }, [input]);

  // Phase 3: auto-focus input after mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  /** iOS Safari: fills the slit between composer and keyboard (layout vs visual viewport).
   * Runs for marketing embedded sheet too — that path previously skipped sync and had no
   * `contact-footer-dock` padding, so the homepage could show through above the keyboard.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (mq.matches) {
        root.style.setProperty('--contact-vv-gap', '0px');
        return;
      }
      const gapPx = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      root.style.setProperty('--contact-vv-gap', `${gapPx}px`);
    };
    sync();
    mq.addEventListener('change', sync);
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      root.style.setProperty('--contact-vv-gap', '0px');
    };
  }, []);

  useEffect(() => {
    const v = customerEmail?.trim();
    if (v) setLeaveEmailInput(v);
  }, [customerEmail]);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // 初始化 provider + 加载会话
  useEffect(() => {
    let cancelled = false;

    const provider = acquireSharedChatProvider();
    providerRef.current = provider;
    setInitializingChat(true);

    const unsubscribe = provider.subscribe({
      onMessage: incoming => {
        if (cancelled) return;
        // Phase 1: disable AI when agent replies
        if (incoming.sender === 'agent') {
          aiDisabledRef.current = true;
          setAiDisabled(true);
          provider.markRead().catch(() => { /* noop */ });
        }
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id || (incoming.clientMsgId && m.clientMsgId === incoming.clientMsgId))) {
            return prev;
          }
          return [...prev, incoming];
        });
      },
      onConnectionChange: state => {
        if (!cancelled) setConnection(state);
      },
    });

    (async () => {
      try {
        const handle = await provider.ensureConversation({
          customerName: userName,
          ...(customerEmail?.trim() ? { customerEmail: customerEmail.trim() } : {}),
        });
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.log('[ContactUs] ensureConversation OK:', handle);
        }
        conversationIdRef.current = handle.id;
        if (handle.existing) {
          setLoadingHistory(true);
          // Use chatService directly to get has_more flag from the API
          try {
            const convIdNum = Number(handle.id);
            const { messages: history, hasMore: more } = await chatService.listMessages(convIdNum);
            if (cancelled) return;
            // If history contains agent messages, this conversation has been
            // escalated to human — disable AI auto-reply.
            const hasAgentMsg = history.some(m => m.sender === 'agent');
            if (hasAgentMsg) {
              aiDisabledRef.current = true;
              setAiDisabled(true);
            }
            setMessages(history.map(m => ({
              id: String(m.id),
              conversationId: handle.id,
              sender: m.sender,
              text: m.content,
              messageType: m.messageType,
              mediaUrl: m.mediaUrl,
              metadata: m.metadata,
              timestamp: new Date(m.createdAt),
              status: m.isRead ? 'read' : 'sent',
              clientMsgId: m.clientMsgId ?? undefined,
              senderName: m.senderName ?? undefined,
              senderAvatar: m.senderAdmin?.avatar ?? undefined,
            })));
            setHasMore(more);
          } catch {
            // Fallback to provider fetchMessages if chatService fails
            const history = await provider.fetchMessages();
            if (cancelled) return;
            if (history.some(m => m.sender === 'agent')) {
              aiDisabledRef.current = true;
              setAiDisabled(true);
            }
            setMessages(history);
          }
          setLoadingHistory(false);
          provider.markRead().catch(() => { /* noop */ });
          return;
        }
        setMessages([
          { id: 'welcome-1', conversationId: handle.id, sender: 'ai', text: t('contact.welcome_msg'), messageType: 'text', timestamp: new Date(Date.now() - 60000), status: 'read', senderName: 'Evair AI' },
          { id: 'welcome-2', conversationId: handle.id, sender: 'ai', text: t('contact.welcome_msg2'), messageType: 'text', timestamp: new Date(Date.now() - 55000), status: 'read', senderName: 'Evair AI' },
        ]);
      } catch (err) {
        if (cancelled) return;
        setLoadingHistory(false);
        if (import.meta.env.DEV) {
          console.warn('[ContactUs] ensureConversation failed, falling back to local provider:', err);
        }
        const localFallback = createChatProvider('local');
        providerRef.current = localFallback;
        try {
          const localHandle = await localFallback.ensureConversation({ customerName: userName });
          if (cancelled) return;
          conversationIdRef.current = localHandle.id;
        } catch {
          if (!cancelled) conversationIdRef.current = 'local-fallback';
        }
        if (!cancelled) {
          setMessages([
            { id: 'welcome-fallback', conversationId: conversationIdRef.current ?? 'local', sender: 'ai', text: t('contact.connect_failed'), messageType: 'text', timestamp: new Date(), status: 'read' },
          ]);
        }
      } finally {
        if (!cancelled) setInitializingChat(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      releaseSharedChatProvider();
      providerRef.current = null;
      conversationIdRef.current = null;
    };
  }, [t, userName, customerEmail]);

  // 滚动跟随：仅在已经接近底部时自动跟，否则让用户阅读不被打断
  const isNearBottom = useCallback((): boolean => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_FOLLOW_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowJumpToLatest(false);
  }, []);

  const adjustComposerHeight = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = `${COMPOSER_MIN_INPUT_PX}px`;
    ta.style.overflowY = 'hidden';
    const next = Math.min(COMPOSER_MAX_INPUT_PX, Math.max(COMPOSER_MIN_INPUT_PX, ta.scrollHeight));
    ta.style.height = `${next}px`;
    ta.style.overflowY = next >= COMPOSER_MAX_INPUT_PX ? 'auto' : 'hidden';
  }, []);

  const footerSendBlocked =
    !input.trim()
    || uploading
    || (leaveMessageMode && !EMAIL_RE.test((leaveEmailInput.trim() || customerEmail?.trim() || '')));

  const handleComposerFocus = useCallback(() => {
    adjustComposerHeight();
    if (isNearBottom()) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [adjustComposerHeight, isNearBottom, scrollToBottom]);

  useLayoutEffect(() => {
    adjustComposerHeight();
  }, [input, adjustComposerHeight]);

  const syncScrollFABsFromEl = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = gap < SCROLL_FOLLOW_THRESHOLD_PX;
    const canScroll = el.scrollHeight > el.clientHeight + 24;
    setShowJumpToLatest(!nearBottom && canScroll);
  }, []);

  const handleScroll = () => {
    syncScrollFABsFromEl();
  };

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    } else {
      setShowJumpToLatest(true);
    }
    requestAnimationFrame(() => syncScrollFABsFromEl());

  }, [messages, isTyping, isNearBottom, scrollToBottom, syncScrollFABsFromEl]);

  // ── Infinite scroll up: load older messages when scrolling to top ──
  const loadOlderMessages = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId || loadingMore || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;

    setLoadingMore(true);
    // Save scrollHeight before prepending — used to restore position after
    prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? 0;

    try {
      // Find the oldest message with a real numeric ID (skip welcome/optimistic UUIDs)
      const realMsg = messages.find(m => {
        const n = Number(m.id);
        return n > 0 && Number.isFinite(n);
      });
      if (!realMsg) {
        setHasMore(false);
        return;
      }
      const convIdNum = Number(convId);
      const beforeId = Number(realMsg.id);
      const { messages: older, hasMore: more } = await chatService.listMessages(convIdNum, { beforeId });
      if (older.length === 0) {
        setHasMore(false);
      } else {
        const mapped = older.map(m => ({
          id: String(m.id),
          conversationId: convId,
          sender: m.sender,
          text: m.content,
          messageType: m.messageType,
          mediaUrl: m.mediaUrl,
          metadata: m.metadata,
          timestamp: new Date(m.createdAt),
          status: m.isRead ? 'read' : 'sent',
          clientMsgId: m.clientMsgId ?? undefined,
          senderName: m.senderName ?? undefined,
          senderAvatar: m.senderAdmin?.avatar ?? undefined,
        }));
        setMessages(prev => [...mapped, ...prev]);
        setHasMore(more);
      }
    } catch {
      // Silently fail — user can retry by scrolling to top again
    } finally {
      setLoadingMore(false);
    }
  }, [messages, loadingMore, hasMore]);

  // Restore scroll position after older messages are prepended
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && prevScrollHeightRef.current > 0) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) {
        el.scrollTop = el.scrollTop + delta;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  // IntersectionObserver on sentinel at top of message list
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadOlderMessages();
        }
      },
      { root: container, rootMargin: '200px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();

  }, [loadingMore, hasMore, loadOlderMessages]);

  // ── 发送 ──────────────────────────────────────────────
  const upsertOptimistic = (msg: UnifiedChatMessage) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.clientMsgId && m.clientMsgId === msg.clientMsgId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = msg;
        return next;
      }
      return [...prev, msg];
    });
  };

  const triggerAiReply = (provider: ChatProvider, query: string, typingMs?: number) => {
    // Phase 1: skip AI when disabled
    if (aiDisabledRef.current) return;

    const aiResult = getMultilingualResponse(query);
    setIsTyping(true);
    const typingDelay = typingMs ?? Math.min(1200 + aiResult.text.length * 8, 3000);
    setTimeout(async () => {
      setIsTyping(false);
      const aiClientId = (window.crypto?.randomUUID?.() ?? `ai-${Date.now()}`);
      try {
        const aiConfirmed = await provider.sendAi({
          text: aiResult.text,
          englishText: aiResult.text !== aiResult.english ? aiResult.english : undefined,
          clientMsgId: aiClientId,
        });
        upsertOptimistic({ ...aiConfirmed, clientMsgId: aiClientId });
      } catch {
        upsertOptimistic({
          id: aiClientId,
          conversationId: conversationIdRef.current!,
          sender: 'ai',
          text: aiResult.text,
          messageType: 'text',
          timestamp: new Date(),
          status: 'sent',
          senderName: 'Evair AI',
          clientMsgId: aiClientId,
        });
      }
    }, typingDelay);
  };

  const sendCustomerMessage = async (text: string, opts?: { skipAi?: boolean; metadata?: Record<string, unknown> }) => {
    const provider = providerRef.current;
    const convId = conversationIdRef.current ?? 'local';
    const isHumanRequest = HUMAN_KEYWORDS.test(text);

    const clientMsgId = (window.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
    const optimistic: UnifiedChatMessage = {
      id: clientMsgId,
      conversationId: convId,
      sender: 'customer',
      text,
      messageType: 'text',
      timestamp: new Date(),
      status: 'sending',
      clientMsgId,
    };
    upsertOptimistic(optimistic);

    if (!provider || !conversationIdRef.current) {
      upsertOptimistic({ ...optimistic, status: 'failed' });
      if (provider) triggerAiReply(provider, text);
      return;
    }

    try {
      const confirmed = await provider.send({
        text,
        clientMsgId,
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      });
      upsertOptimistic({ ...confirmed, clientMsgId });
    } catch {
      upsertOptimistic({ ...optimistic, status: 'failed' });
      return;
    }

    if (isHumanRequest) {
      // Phase 1: disable AI + mark needs human (no page switch)
      aiDisabledRef.current = true;
      setAiDisabled(true);
      provider.markNeedsHuman().catch(() => { /* noop */ });
      return;
    }

    if (!opts?.skipAi) {
      triggerAiReply(provider, text);
    }
  };

  // Phase 2: image / file upload
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.currentTarget.value = '';
    setUploading(true);
    const clientId = newClientMsgId();
    const convId = conversationIdRef.current ?? 'local';

    // Optimistic placeholder
    const optimistic: UnifiedChatMessage = {
      id: clientId,
      conversationId: convId,
      sender: 'customer',
      text: file.name,
      messageType: 'image',
      mediaUrl: URL.createObjectURL(file),
      timestamp: new Date(),
      status: 'sending',
      clientMsgId: clientId,
    };
    upsertOptimistic(optimistic);

    try {
      const convIdNum = Number(conversationIdRef.current);
      const uploadRes = await chatService.uploadAttachment(file, 'image');
      const sent = await chatService.sendMessage(convIdNum, {
        content: file.name,
        message_type: 'image',
        client_msg_id: clientId,
        media_url: uploadRes.url,
        metadata: {
          original_name: uploadRes.original_name,
          mime_type: uploadRes.mime_type,
          size: uploadRes.size,
          extension: uploadRes.extension,
        },
      });
      upsertOptimistic({
        id: String(sent.id),
        conversationId: convId,
        sender: 'customer',
        text: sent.content,
        messageType: sent.messageType,
        mediaUrl: sent.mediaUrl,
        metadata: sent.metadata,
        timestamp: new Date(sent.createdAt),
        status: 'sent',
        clientMsgId: clientId,
      });
      URL.revokeObjectURL(optimistic.mediaUrl!);
    } catch {
      upsertOptimistic({ ...optimistic, status: 'failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.currentTarget.value = '';
    setUploading(true);
    const clientId = newClientMsgId();
    const convId = conversationIdRef.current ?? 'local';

    const optimistic: UnifiedChatMessage = {
      id: clientId,
      conversationId: convId,
      sender: 'customer',
      text: file.name,
      messageType: 'file',
      timestamp: new Date(),
      status: 'sending',
      clientMsgId: clientId,
      metadata: {
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
      },
    };
    upsertOptimistic(optimistic);

    try {
      const convIdNum = Number(conversationIdRef.current);
      const uploadRes = await chatService.uploadAttachment(file, 'file');
      const sent = await chatService.sendMessage(convIdNum, {
        content: file.name,
        message_type: 'file',
        client_msg_id: clientId,
        media_url: uploadRes.url,
        metadata: {
          original_name: uploadRes.original_name,
          mime_type: uploadRes.mime_type,
          size: uploadRes.size,
          extension: uploadRes.extension,
        },
      });
      upsertOptimistic({
        id: String(sent.id),
        conversationId: convId,
        sender: 'customer',
        text: sent.content,
        messageType: sent.messageType,
        mediaUrl: sent.mediaUrl,
        metadata: sent.metadata,
        timestamp: new Date(sent.createdAt),
        status: 'sent',
        clientMsgId: clientId,
      });
    } catch {
      upsertOptimistic({ ...optimistic, status: 'failed' });
    } finally {
      setUploading(false);
    }
  };

  const retryFailed = (msg: UnifiedChatMessage) => {
    if (msg.sender !== 'customer' || msg.status !== 'failed') return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    sendCustomerMessage(msg.text);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (leaveSuccess) return;

    if (leaveMessageMode) {
      const mergedEmail = leaveEmailInput.trim() || customerEmail?.trim() || '';
      if (!EMAIL_RE.test(mergedEmail)) {
        setLeaveEmailError(t('contact.email_invalid'));
        return;
      }
      setLeaveEmailError(null);

      const provider = providerRef.current;
      if (!provider) return;

      try {
        const handle = await provider.ensureConversation({
          customerName: userName,
          customerEmail: mergedEmail,
        });
        conversationIdRef.current = handle.id;
        aiDisabledRef.current = true;
        setAiDisabled(true);
        provider.markNeedsHuman().catch(() => { /* noop */ });
        await sendCustomerMessage(trimmed, { skipAi: true, metadata: { email_ack_requested: true } });
        setLeaveSuccess({ emailConfirmed: provider.name === 'laravel', email: mergedEmail });
        setLeaveMessageMode(false);
      } catch {
        // Optimistic row will show failed / sendCustomerMessage already surfaced
      }

      setInput('');
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch { /* noop */ }
      return;
    }

    setInput('');
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
    await sendCustomerMessage(trimmed);
  };

  const handleSuggestionChip = async (key: (typeof COMPOSER_SUGGESTION_KEYS)[number]) => {
    const label = t(`contact.${key}`);
    const prefixed = `${t('contact.need_help_with')} ${label}`;
    await sendCustomerMessage(prefixed, { skipAi: true });
    if (!aiDisabledRef.current) {
      const provider = providerRef.current;
      if (provider) triggerAiReply(provider, SUGGESTION_AI_QUERY[key]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!footerSendBlocked) {
        void handleSend();
      }
    }
  };

  // Phase 1: mark needs human helper
  const handleTransferToHuman = () => {
    aiDisabledRef.current = true;
    setAiDisabled(true);
    providerRef.current?.markNeedsHuman().catch(() => { /* noop */ });
  };

  const confirmLiveStaffRequest = () => {
    setHeaderMenuOpen(false);
    setLiveStaffModalOpen(false);
    handleTransferToHuman();
    void sendCustomerMessage(t('contact.live_staff_request_note'), { skipAi: true });
  };

  // 富媒体渲染：image / file / order / product
  const renderRichBody = (msg: UnifiedChatMessage, isCustomer: boolean) => {
    if (msg.messageType === 'image' && msg.mediaUrl) {
      return (
        <button
          onClick={() => setLightboxUrl(msg.mediaUrl!)}
          style={{ display: 'block', padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in' }}
        >
          <img
            src={msg.mediaUrl}
            alt={msg.text || 'image'}
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 12, display: 'block', objectFit: 'cover' }}
          />
        </button>
      );
    }
    // Phase 2: file type rendering
    if (msg.messageType === 'file') {
      const meta = (msg.metadata ?? {}) as Record<string, unknown>;
      const name = (meta.original_name as string) || msg.text || 'file';
      const mime = (meta.mime_type as string) || '';
      const size = typeof meta.size === 'number' ? meta.size : undefined;
      const sizeLabel = size !== undefined ? formatFileSize(size) : null;
      return (
        <a
          href={msg.mediaUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          onClick={e => { if (!msg.mediaUrl) e.preventDefault(); }}
          className="active:scale-[0.98]"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: isCustomer ? 'rgba(255,255,255,0.15)' : '#f8fafc',
            maxWidth: '100%',
            minWidth: 0,
            alignSelf: 'stretch',
            boxSizing: 'border-box',
            textDecoration: 'none',
            transition: 'transform 0.1s, background-color 0.15s',
          }}
        >
          <FileText size={18} style={{ color: isCustomer ? 'rgba(255,255,255,0.8)' : '#64748b', marginTop: 2, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: isCustomer ? '#fff' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            {[mime, sizeLabel].filter(Boolean).length > 0 && (
              <div style={{ fontSize: 11, color: isCustomer ? 'rgba(255,255,255,0.75)' : '#94a3b8', marginTop: 2 }}>
                {[mime, sizeLabel].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </a>
      );
    }
    // Phase 2: improved order card with status color
    if (msg.messageType === 'order' && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>;
      const status = ((meta.status as string) ?? 'pending').toUpperCase();
      const statusLabel = (() => {
        if (status.includes('PAID') || status === 'COMPLETED') return 'Paid';
        if (status.includes('PENDING')) return 'Pending';
        if (status.includes('FAIL')) return 'Failed';
        if (status.includes('CANCEL') || status === 'REFUNDED') return 'Cancelled';
        return status || 'Unknown';
      })();
      const statusBg = statusLabel === 'Paid' ? '#dcfce7' : statusLabel === 'Pending' ? '#fef9c3' : statusLabel === 'Failed' ? '#fee2e2' : '#f1f5f9';
      const statusColor = statusLabel === 'Paid' ? '#15803d' : statusLabel === 'Pending' ? '#a16207' : statusLabel === 'Failed' ? '#dc2626' : '#475569';
      const { cents, currency } = parseAmount(meta);
      return (
        <button
          onClick={() => setDetailSheet({ type: 'order', meta })}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%', maxWidth: '100%', padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', transition: 'transform 0.1s' }}
          className="active:scale-[0.98]"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('contact.order_card')}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: isCustomer ? '#fff' : '#1e293b' }}>#{String(meta.order_no ?? meta.id ?? '-')}</p>
            {meta.title ? <p style={{ fontSize: 13, marginTop: 2 }}>{String(meta.title)}</p> : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, backgroundColor: statusBg, color: statusColor }}>{statusLabel}</span>
              {cents > 0 && <span style={{ fontSize: 13, fontWeight: 600 }}>{formatAmountCents(cents, currency)}</span>}
            </div>
          </div>
        </button>
      );
    }
    // Phase 2: improved product card with price parsing
    if (msg.messageType === 'product' && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>;
      const { cents, currency } = parseAmount(meta, 'price');
      return (
        <button
          onClick={() => setDetailSheet({ type: 'product', meta })}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%', maxWidth: '100%', padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', transition: 'transform 0.1s' }}
          className="active:scale-[0.98]"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('contact.product_card')}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: isCustomer ? '#fff' : '#1e293b' }}>{String(meta.name ?? '-')}</p>
            {cents > 0 && <p style={{ fontSize: 13, marginTop: 2, fontWeight: 600 }}>{formatAmountCents(cents, currency)}</p>}
          </div>
        </button>
      );
    }
    return isCustomer ? msg.text : <RichText text={msg.text} />;
  };

  // 在 messages 中插入日期分隔条（确保按时间升序排列）
  const messageItems = useMemo(() => {
    const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const items: Array<{ kind: 'divider'; key: string; label: string } | { kind: 'msg'; key: string; msg: UnifiedChatMessage }> = [];
    let prev: UnifiedChatMessage | null = null;
    for (const m of sorted) {
      if (!prev || !sameDay(prev.timestamp, m.timestamp)) {
        items.push({ kind: 'divider', key: `d-${m.timestamp.toDateString()}-${m.id}`, label: formatDateLabel(m.timestamp, t) });
      }
      items.push({ kind: 'msg', key: m.id, msg: m });
      prev = m;
    }
    return items;
  }, [messages, t]);

  const chipKeys = useMemo(() => {
    const ctx = contextualSuggestionsFromPath(pathname);
    const tail = COMPOSER_SUGGESTION_KEYS.filter(k => !ctx.includes(k));
    return uniqSuggestionKeys([...ctx, ...tail]);
  }, [pathname]);

  const showChatSkeleton = initializingChat || loadingHistory;

  const connectionLabel = (() => {
    switch (connection) {
      case 'reconnecting': return t('contact.reconnecting');
      case 'offline': return t('contact.offline');
      case 'connecting': return t('contact.connecting');
      default: return null;
    }
  })();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden overflow-x-hidden bg-[#ECE5DD]">
      {/* WhatsApp-density header: gradient bar + ⋮ overflow (live staff, default AI) */}
      <header
        className={`relative z-[41] shrink-0 overflow-visible border-b border-white/15 bg-gradient-to-br from-[#FF6600] via-[#FF7433] to-[#FF8533] shadow-md ${embedded ? 'pb-1.5 pt-[max(8px,env(safe-area-inset-top,0px))]' : 'pb-1.5 pt-[max(6px,env(safe-area-inset-top,0px))]'}`}
      >
        <div className={`flex min-h-[44px] items-center gap-2 px-3 ${embedded ? '' : ''}`}>
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/20 text-white transition-colors active:bg-white/30"
            aria-label={t('barcode_scanner.close')}
          >
            <ChevronLeft size={23} color="#fff" strokeWidth={2.5} />
          </button>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-white/40">
            {aiDisabled ? (
              <Headphones size={18} color="#059669" strokeWidth={2.2} />
            ) : (
              <Sparkles size={18} color="#FF6600" strokeWidth={2.2} />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-[11px] w-[11px] items-center justify-center rounded-full border-2 border-[#ea580c] bg-emerald-400 shadow-sm" aria-hidden>
              {aiDisabled ? <span className="h-1 w-1 rounded-full bg-white" /> : <Bot size={6} color="#fff" strokeWidth={3} />}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-white">{t('contact.title')}</h1>
            <p className="mt-px truncate text-[11px] font-medium leading-tight text-white/90">
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-300" />
                {aiDisabled ? t('contact.header_mode_agent_live') : t('contact.header_mode_ai_assistant')}
              </span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-white/85">
              {t('contact.sla_hint')}
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setHeaderMenuOpen(open => !open)}
              className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-white/15 text-white transition-colors active:bg-white/25"
              aria-expanded={headerMenuOpen}
              aria-haspopup="menu"
              aria-label={t('contact.chat_overflow_menu')}
            >
              <MoreVertical size={21} strokeWidth={2} />
            </button>
            {headerMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-[38] bg-black/25"
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-[45] mt-1 max-h-[min(60vh,20rem)] w-[min(calc(100vw-56px),16rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 active:bg-slate-100"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setLiveStaffModalOpen(true);
                    }}
                  >
                    <Headphones size={18} className="text-[#059669]" aria-hidden />
                    {t('contact.menu_live_staff')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 active:bg-slate-100"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      if (aiDisabled) {
                        aiDisabledRef.current = false;
                        setAiDisabled(false);
                      }
                    }}
                  >
                    <Sparkles size={18} className="text-[#FF6600]" aria-hidden />
                    {t('contact.menu_ai_assistant_default')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* 网络状态条：仅在非 connected 时显示 */}
      {connectionLabel && (
        <div className="shrink-0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', backgroundColor: connection === 'offline' ? '#FEF3C7' : '#FEF9C3', color: '#854D0E', fontSize: 12, fontWeight: 600 }}>
          {connection === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
          {connectionLabel}
        </div>
      )}



      {/* Scrollable messages — only this region scrolls; composer stays put */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`touch-pan-y min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain no-scrollbar ${embedded ? 'px-3 pt-1.5 pb-3 sm:px-4' : 'px-3 pt-1.5 lg:pb-3 max-lg:pb-[calc(0.75rem+11.75rem+env(safe-area-inset-bottom,0px)+var(--contact-vv-gap,0px))]'} bg-[#ECE5DD]`}
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {showChatSkeleton ? (
            <div className="space-y-4 px-2 py-8" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={`sk-${i}`}
                  className={`flex w-full touch-none ${i % 2 === 1 ? 'justify-end pr-4' : 'justify-start pl-4'}`}
                >
                  <div
                    className="contact-chat-skeleton-bar h-[52px] w-[74%] max-w-[19rem] rounded-[18px]"
                    style={{ transition: 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* IntersectionObserver sentinel for infinite scroll up */}
              <div ref={sentinelRef} style={{ height: 1 }} />

              {/* Loading older messages spinner (at top, above sentinel) */}
              {loadingMore && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
                <Loader2 size={14} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{t('contact.loading_messages')}</span>
              </div>
              )}

              {/* "Beginning of conversation" indicator */}
              {!hasMore && messages.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>
                  {t('contact.loading_messages').replace('...', '')}
                </span>
              </div>
              )}

          {messageItems.map(item => {
          if (item.kind === 'divider') {
            return (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#5b6470', backgroundColor: 'rgba(253,251,246,0.92)', padding: '4px 12px', borderRadius: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                  {item.label}
                </span>
              </div>
            );
          }
          const msg = item.msg;
          const isCustomer = msg.sender === 'customer';
          const isAgent = msg.sender === 'agent';
          const isAi = msg.sender === 'ai';
          const isFailed = msg.status === 'failed';
          const isSending = msg.status === 'sending';
          return (
            <div key={item.key} className="chat-msg-enter" style={{ display: 'flex', justifyContent: isCustomer ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {!isCustomer && (
                <div style={{ width: 28, height: 28, borderRadius: 10, background: isAgent ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #FF6600, #FF8533)', flexShrink: 0, marginRight: 8, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {isAgent && msg.senderAvatar
                    ? <img src={msg.senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : isAgent
                      ? <Headphones size={14} color="#fff" />
                      : <Sparkles size={14} color="#fff" />
                  }
                </div>
              )}
              <div className="min-w-0 max-w-[78%]">
                {(isAgent || isAi) && (
                  <p style={{ fontSize: 11, color: isAgent ? '#10B981' : '#FF6600', fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>
                    {isAi ? 'Evair AI' : (msg.senderName || t('contact.agent_name'))}
                  </p>
                )}
                <div
                  onDoubleClick={() => isFailed && retryFailed(msg)}
                  className="overflow-hidden break-words"
                  style={{
                    padding: msg.messageType === 'image' ? 4 : '12px 16px',
                    borderRadius: isCustomer ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: isCustomer ? '#FF6600' : '#fff',
                    color: isCustomer ? '#fff' : '#1e293b',
                    fontSize: 15,
                    lineHeight: 1.5,
                    fontWeight: 450,
                    boxShadow: isCustomer ? '0 2px 8px rgba(255,102,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                    opacity: isSending ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {renderRichBody(msg, isCustomer)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isCustomer ? 'flex-end' : 'flex-start', marginTop: 4, paddingLeft: 4, paddingRight: 4 }}>
                  {isFailed ? (
                    <button onClick={() => retryFailed(msg)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#DC2626', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                      <AlertCircle size={12} />
                      {t('contact.tap_to_retry')}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{formatTime(msg.timestamp)}</span>
                  )}
                  {isCustomer && !isFailed && (
                    <CheckCheck size={13} color={msg.status === 'read' ? '#FF6600' : '#94a3b8'} strokeWidth={2.5} style={{ opacity: isSending ? 0.4 : 1 }} />
                  )}
                </div>
              </div>
            </div>
          );
          })}

          {isTyping && (
          <div className="chat-msg-enter" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: aiDisabled ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #FF6600, #FF8533)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {aiDisabled ? <Headphones size={14} color="#fff" /> : <Sparkles size={14} color="#fff" />}
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '18px 18px 18px 4px', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#94a3b8', animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
          )}
          <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className={`pointer-events-auto absolute left-1/2 z-[34] flex max-w-[calc(100%-2rem)] -translate-x-1/2 touch-manipulation items-center gap-2 rounded-full border border-slate-200/90 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.14)] active:scale-[0.98] ${
              embedded
                ? 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'
                : 'max-lg:bottom-[calc(0.75rem+11.75rem+env(safe-area-inset-bottom,0px)+var(--contact-vv-gap,0px))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'
            }`}
            aria-label={t('contact.jump_to_latest')}
          >
            <ArrowDown size={18} className="shrink-0 text-slate-600" aria-hidden />
            <span className="truncate">{t('contact.jump_to_recent_pill')}</span>
          </button>
        )}
      </div>

      <footer
        className={`shrink-0 bg-[#F0F2F5] px-3 pt-3 ${
          embedded
            ? [
                'relative z-20',
                // Same iOS slit fill as standalone chat; lg: restores normal padding when
                // `contact-footer-dock` media rule is off (wide desktop + floating card).
                'contact-footer-dock lg:pb-[max(14px,calc(10px+env(safe-area-inset-bottom,0px)))]',
              ].join(' ')
            : [
                'isolate z-[32] lg:relative lg:z-20',
                'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0',
                'max-lg:border-t max-lg:border-slate-200/80 max-lg:shadow-[0_-8px_28px_rgba(15,23,42,0.08)]',
                'contact-footer-dock',
                'lg:pb-[max(14px,calc(10px+env(safe-area-inset-bottom,0px)))]',
              ].join(' ')
        }`}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-2">
          {leaveSuccess ? (
            <div
              className="rounded-2xl border border-black/[0.05] bg-white p-6 text-center shadow-[0_10px_40px_-16px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.03]"
            >
              <h3 className="text-[17px] font-bold tracking-tight text-slate-900">{t('contact.leave_success_title')}</h3>
              <p className="mt-2 px-1 text-[14px] leading-relaxed text-slate-600">
                {leaveSuccess.emailConfirmed
                  ? t('contact.leave_success_with_email', { email: leaveSuccess.email })
                  : t('contact.leave_success_no_email_delivery')}
              </p>
              <button
                type="button"
                className="mt-5 w-full min-h-[48px] touch-manipulation rounded-xl bg-[#FF6600] text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,102,0,0.55)] transition-transform active:scale-[0.99]"
                onClick={() => setLeaveSuccess(null)}
              >
                {t('contact.leave_flow_done_cta')}
              </button>
            </div>
          ) : (
            <>
              {leaveMessageMode ? (
                <label className="flex flex-col gap-1 px-0.5">
                  <span className="text-[12px] font-semibold text-slate-700">{t('contact.email_capture_label')}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={leaveEmailInput}
                    placeholder={t('contact.email_capture_placeholder')}
                    onChange={e => {
                      setLeaveEmailInput(e.target.value);
                      setLeaveEmailError(null);
                    }}
                    className="min-h-[44px] rounded-xl border-none bg-white px-3 py-2.5 font-sans text-[15px] text-slate-900 shadow-inner ring-1 ring-black/[0.06] outline-none placeholder:text-slate-400 focus:shadow-[0_0_0_2px_rgba(255,102,0,0.25)]"
                  />
                  {leaveEmailError ? (
                    <span className="text-[11px] font-semibold text-red-600">{leaveEmailError}</span>
                  ) : null}
                </label>
              ) : null}

              <div
                className="flex gap-2 overflow-x-auto overscroll-x-contain py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: 'touch' }}
                role="group"
                aria-label={t('contact.suggestion_chips_label')}
              >
                <button
                  type="button"
                  onClick={() => {
                    setLeaveMessageMode(true);
                    setLeaveEmailError(null);
                  }}
                  disabled={uploading}
                  className="shrink-0 whitespace-nowrap rounded-full border border-transparent bg-gradient-to-br from-[#FF6600] to-[#FF8A3D] px-3 py-1.5 text-[12px] font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(255,102,0,0.55)] transition-[transform,box-shadow] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  {t('contact.leave_message_quick')}
                </button>
                {chipKeys.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void handleSuggestionChip(key)}
                    disabled={uploading}
                    className="shrink-0 whitespace-nowrap rounded-full border border-orange-100/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#c2410c] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors active:bg-orange-50/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t(`contact.${key}`)}
                  </button>
                ))}
              </div>

              <div className="flex min-h-[48px] w-full min-w-0 touch-manipulation items-center gap-1 rounded-[28px] bg-white px-2 py-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]">
            <button
              type="button"
              onClick={() => setAttachMenuOpen(true)}
              disabled={uploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-none bg-transparent text-slate-500 transition-colors active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Paperclip size={21} strokeWidth={2} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              enterKeyHint="send"
              onChange={e => {
                setInput(e.target.value);
                requestAnimationFrame(adjustComposerHeight);
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleComposerFocus}
              placeholder={t('contact.type_message')}
              rows={1}
              spellCheck
              aria-label={t('contact.type_message')}
              className="box-border min-h-[44px] min-w-0 flex-1 resize-none overflow-hidden border-none bg-white px-2 py-2.5 font-sans text-[16px] leading-snug text-[#1f2937] [-webkit-appearance:none] outline-none"
              style={{
                maxHeight: COMPOSER_MAX_INPUT_PX,
              }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={footerSendBlocked}
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border-none transition-colors"
              style={{
                backgroundColor: !footerSendBlocked ? '#FF6600' : '#e2e8f0',
                cursor: !footerSendBlocked ? 'pointer' : 'default',
                boxShadow: !footerSendBlocked ? '0 2px 8px rgba(255,102,0,0.25)' : 'none',
              }}
            >
              {uploading
                ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
              }
            </button>
          </div>
            </>
          )}
        </div>
      </footer>

      {liveStaffModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-staff-modal-title"
          onClick={() => setLiveStaffModalOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 id="live-staff-modal-title" className="text-lg font-bold text-slate-900">
              {t('contact.live_staff_modal_title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('contact.live_staff_modal_body')}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="min-h-[44px] flex-1 touch-manipulation rounded-xl border border-slate-200 py-3 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setLiveStaffModalOpen(false)}
              >
                {t('contact.live_staff_modal_cancel')}
              </button>
              <button
                type="button"
                className="min-h-[44px] flex-1 touch-manipulation rounded-xl bg-[#FF6600] py-3 text-[15px] font-semibold text-white shadow-md transition-colors hover:bg-[#e65c00]"
                onClick={confirmLiveStaffRequest}
              >
                {t('contact.live_staff_modal_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Attach menu (bottom sheet) */}
      {attachMenuOpen && (
        <div
          onClick={() => setAttachMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: '20px 20px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', padding: '8px 0 24px', animation: 'slideUp 0.2s ease-out' }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', margin: '8px auto 16px' }} />
            <button
              onClick={() => { setAttachMenuOpen(false); imageInputRef.current?.click(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 12, transition: 'background-color 0.1s' }}
              onMouseDown={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseUp={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImagePlus size={18} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: 15, color: '#1e293b', fontWeight: 500 }}>{t('contact.attach_image')}</span>
            </button>
            <button
              onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 12, transition: 'background-color 0.1s' }}
              onMouseDown={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseUp={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#64748b" />
              </div>
              <span style={{ fontSize: 15, color: '#1e293b', fontWeight: 500 }}>{t('contact.attach_file')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase 2: hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleImagePick} />
      <input ref={fileInputRef} type="file" accept="application/pdf,text/plain,text/csv" style={{ display: 'none' }} onChange={handleFilePick} />

      {/* Product / Order 详情底部弹窗 */}
      {detailSheet && (
        <div
          onClick={() => setDetailSheet(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-2xl shadow-xl max-h-[70vh] flex flex-col animate-slide-up"
          >
            {/* Drag handle + title */}
            <div className="flex items-center px-4 pt-3 pb-2 border-b border-slate-100">
              <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -top-1.5" />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: detailSheet.type === 'product' ? '#f0f9ff' : '#f1f5f9' }}>
                {detailSheet.type === 'product'
                  ? <Package size={18} className="text-sky-500" />
                  : <Receipt size={18} className="text-slate-500" />
                }
              </div>
              <h3 className="font-semibold text-slate-900 flex-1 ml-3">
                {detailSheet.type === 'product' ? t('contact.product_detail') : t('contact.order_detail')}
              </h3>
              <button
                onClick={() => setDetailSheet(null)}
                aria-label="Close"
                className="p-1 -m-1 active:bg-slate-100 rounded-full text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {detailSheet.type === 'product' ? (
                <div className="space-y-4">
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                      {String(detailSheet.meta.name ?? '-')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Price */}
                    {(() => {
                      const { cents, currency } = parseAmount(detailSheet.meta, 'price');
                      return cents > 0 ? (
                        <div style={{ padding: '12px', borderRadius: 12, backgroundColor: '#fff7ed' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Price</p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#ea580c' }}>{formatAmountCents(cents, currency)}</p>
                        </div>
                      ) : null;
                    })()}
                    {/* Location */}
                    {detailSheet.meta.location_name || detailSheet.meta.location ? (
                      <div style={{ padding: '12px', borderRadius: 12, backgroundColor: '#f8fafc' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Location</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{String(detailSheet.meta.location_name ?? detailSheet.meta.location ?? '-')}</p>
                      </div>
                    ) : null}
                    {/* Data Volume */}
                    {detailSheet.meta.data_volume_gb ? (
                      <div style={{ padding: '12px', borderRadius: 12, backgroundColor: '#f0f9ff' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{t('contact.data_volume')}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{Number(detailSheet.meta.data_volume_gb)} GB</p>
                      </div>
                    ) : null}
                    {/* Validity */}
                    {detailSheet.meta.duration_days ? (
                      <div style={{ padding: '12px', borderRadius: 12, backgroundColor: '#f8fafc' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{t('contact.validity_period')}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{Number(detailSheet.meta.duration_days)} {t('contact.days_unit')}</p>
                      </div>
                    ) : null}
                  </div>
                  {/* Package Code */}
                  {detailSheet.meta.package_code ? (
                    <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#f1f5f9' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>Code</p>
                      <p style={{ fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>{String(detailSheet.meta.package_code)}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                      #{String(detailSheet.meta.order_no ?? detailSheet.meta.order_id ?? detailSheet.meta.id ?? '-')}
                    </p>
                  </div>
                  {/* Package name */}
                  {detailSheet.meta.title || detailSheet.meta.package_name ? (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Plan</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{String(detailSheet.meta.title ?? detailSheet.meta.package_name ?? '-')}</p>
                    </div>
                  ) : null}
                  {/* Status + Amount row */}
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const status = ((detailSheet.meta.status as string) ?? 'pending').toUpperCase();
                      const statusLabel = (() => {
                        if (status.includes('PAID') || status === 'COMPLETED') return 'Paid';
                        if (status.includes('PENDING')) return 'Pending';
                        if (status.includes('FAIL')) return 'Failed';
                        if (status.includes('CANCEL') || status === 'REFUNDED') return 'Cancelled';
                        return status || 'Unknown';
                      })();
                      const statusBg = statusLabel === 'Paid' ? '#dcfce7' : statusLabel === 'Pending' ? '#fef9c3' : statusLabel === 'Failed' ? '#fee2e2' : '#f1f5f9';
                      const statusColor = statusLabel === 'Paid' ? '#15803d' : statusLabel === 'Pending' ? '#a16207' : statusLabel === 'Failed' ? '#dc2626' : '#475569';
                      return (
                        <div style={{ padding: '12px', borderRadius: 12, backgroundColor: statusBg }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Status</p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: statusColor }}>{statusLabel}</p>
                        </div>
                      );
                    })()}
                    {(() => {
                      const { cents, currency } = parseAmount(detailSheet.meta);
                      return cents > 0 ? (
                        <div style={{ padding: '12px', borderRadius: 12, backgroundColor: '#fff7ed' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Amount</p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#ea580c' }}>{formatAmountCents(cents, currency)}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="px-4 pb-6 pt-2 border-t border-slate-100">
              {detailSheet.type === 'product' ? (
                <button
                  onClick={() => { setDetailSheet(null); window.location.hash = '#shop'; }}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: '#FF6600', boxShadow: '0 2px 8px rgba(255,102,0,0.3)' }}
                >
                  {t('contact.buy_now')}
                </button>
              ) : (
                <button
                  onClick={() => { setDetailSheet(null); window.location.hash = '#sim-card'; }}
                  className="w-full py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: '#fff', border: '1.5px solid #e2e8f0', color: '#334155' }}
                >
                  {t('contact.view_order')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图片灯箱 */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.15s ease-out' }}
        >
          {/* 右上角关闭按钮 */}
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }}
            aria-label="Close"
          >
            <X size={20} color="#fff" />
          </button>
          {/* 点击图片区域关闭 */}
          <div onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', inset: 0, cursor: 'zoom-out' }} />
          <img src={lightboxUrl} alt="" style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: 8, position: 'relative', zIndex: 1, userSelect: 'none' }} />
          {/* 底部下载按钮 */}
          <a
            href={lightboxUrl}
            download
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', zIndex: 101 }}
          >
            <Download size={16} />
            {t('contact.download')}
          </a>
        </div>
      )}

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0.7; }
          to { transform: translateY(0); opacity: 1; }
        }
        /* Smooth message entrance */
        .chat-msg-enter {
          animation: chatMsgSlideIn 0.25s ease-out;
        }
        @keyframes chatMsgSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        /* Scroll momentum on iOS */
        .no-scrollbar {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default ContactUsView;
