import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Paperclip, CheckCheck, Bot, Sparkles, AlertCircle, ArrowDown, Wifi, WifiOff, Headphones, ImagePlus, FileText, Loader2, X, Package, Receipt, Download } from 'lucide-react';
import { getMultilingualResponse } from '../ai/evairAssistant';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { chatService, newClientMsgId } from '../services/api/chat';
import {
  acquireSharedChatProvider,
  createChatProvider,
  releaseSharedChatProvider,
  resolveProviderName,
  type ChatProvider,
  type ConnectionState,
  type UnifiedChatMessage,
} from '../services/chat';


interface ContactUsViewProps {
  onBack: () => void;
  userName?: string;
  /** Marketing slide-over / sheet: constrain height instead of forcing full viewport scroll */
  embedded?: boolean;
}

const CATEGORY_KEYS = [
  'sim_activation',
  'ecard_help',
  'data_topup',
  'billing_issue',
  'network_problem',
  'other',
] as const;

const CATEGORY_TO_AI_QUERY: Record<string, string> = {
  sim_activation: 'How do I activate my SIM card?',
  ecard_help: 'What is the Evair eCard and how to set it up?',
  data_topup: 'How can I top up my data plan?',
  billing_issue: 'I have a billing question about my payment',
  network_problem: 'My eSIM is not working, no signal or internet',
  other: 'I need help',
};

const HUMAN_KEYWORDS = /\b(human|agent|real person|speak to someone|talk to person|live chat|representative|operator|transfer)\b|人工|客服|真人|转接|找人|humano|agente|persona real/i;

const DRAFT_KEY = 'evair-chat-draft';
const SCROLL_FOLLOW_THRESHOLD_PX = 80;

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
  embedded = false,
}) => {
  const { t } = useTranslation();
  useEdgeSwipeBack(onBack);
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [input, setInput] = useState<string>(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const providerName = useMemo(() => {
    const resolved = resolveProviderName();
    if (import.meta.env.DEV) {
      console.log('[ContactUs] provider resolved:', resolved, '| hasToken:', !!localStorage.getItem('evair_access_token'));
    }
    return resolved;
  }, []);

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

  // 初始化 provider + 加载会话
  useEffect(() => {
    let cancelled = false;

    const provider = acquireSharedChatProvider();
    providerRef.current = provider;

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
        const handle = await provider.ensureConversation({ customerName: userName });
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
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      releaseSharedChatProvider();
      providerRef.current = null;
      conversationIdRef.current = null;
    };
  }, [t, userName]);

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

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages, isTyping, isNearBottom, scrollToBottom]);

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

  const handleScroll = () => {
    if (isNearBottom()) setShowJumpToLatest(false);
  };

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

  const sendCustomerMessage = async (text: string, opts?: { skipAi?: boolean }) => {
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
      const confirmed = await provider.send({ text, clientMsgId });
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
    setInput('');
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    await sendCustomerMessage(trimmed);
  };

  const handleCategorySelect = async (cat: string) => {
    setSelectedCategory(cat);
    const provider = providerRef.current;
    if (!provider || !conversationIdRef.current) return;
    await sendCustomerMessage(`${t('contact.need_help_with')} ${cat}`, { skipAi: true });
    const matchedKey = CATEGORY_KEYS.find(k => t(`contact.${k}`) === cat);
    const aiQuery = (matchedKey && CATEGORY_TO_AI_QUERY[matchedKey]) || cat;
    triggerAiReply(provider, aiQuery, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Phase 1: mark needs human helper
  const handleTransferToHuman = () => {
    aiDisabledRef.current = true;
    setAiDisabled(true);
    providerRef.current?.markNeedsHuman().catch(() => { /* noop */ });
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
            style={{ maxWidth: 220, maxHeight: 240, borderRadius: 12, display: 'block', objectFit: 'cover' }}
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
            minWidth: 220,
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
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220, padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', transition: 'transform 0.1s' }}
          className="active:scale-[0.98]"
        >
          <div style={{ flex: 1 }}>
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
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220, padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', transition: 'transform 0.1s' }}
          className="active:scale-[0.98]"
        >
          <div style={{ flex: 1 }}>
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

  const connectionLabel = (() => {
    switch (connection) {
      case 'reconnecting': return t('contact.reconnecting');
      case 'offline': return t('contact.offline');
      case 'connecting': return t('contact.connecting');
      default: return null;
    }
  })();

  return (
    <div
      className={
        embedded
          ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[#F2F4F7]'
          : 'lg:h-full min-h-screen lg:min-h-0 flex flex-col bg-[#F2F4F7] relative'
      }
    >
      {/* Header */}
      <div className="pt-safe px-4 pb-3 sticky top-0 z-10 rounded-b-2xl shadow-md" style={{ background: 'linear-gradient(180deg, #FF6600 0%, #FF8533 100%)' }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors">
            <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight">{t('contact.title')}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-sm text-white/85 font-medium">{aiDisabled ? t('contact.agent_status') : t('contact.online_status')}</span>
            </div>
          </div>
          {/* Phase 1: headphone button triggers markNeedsHuman + setAiDisabled */}
          <button
            onClick={handleTransferToHuman}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
            aria-label={t('contact.talk_to_human')}
            title={t('contact.talk_to_human')}
          >
            <Headphones size={18} color="#fff" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-3 ml-12">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              {/* Phase 1: icon switches between Sparkles (AI) and Headphones (agent) */}
              {aiDisabled
                ? <Headphones size={16} color="#10B981" />
                : <Sparkles size={16} color="#FF6600" />
              }
            </div>
            {aiDisabled ? (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#FF6600] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            ) : (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#FF6600] flex items-center justify-center">
                <Bot size={8} color="#fff" strokeWidth={3} />
              </div>
            )}
          </div>
          <div>
            {/* Phase 1: subtitle changes based on aiDisabled */}
            <span className="text-sm font-semibold text-white">{aiDisabled ? t('contact.agent_name') : 'Evair AI Assistant'}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-white/70 font-medium">{aiDisabled ? t('contact.agent_status') : 'Powered by AI'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 网络状态条：仅在非 connected 时显示 */}
      {connectionLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', backgroundColor: connection === 'offline' ? '#FEF3C7' : '#FEF9C3', color: '#854D0E', fontSize: 12, fontWeight: 600 }}>
          {connection === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
          {connectionLabel}
        </div>
      )}

      {/* Messages Area — pb: full-page uses fixed composer (~96px); embedded keeps composer in-flow */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: embedded ? 16 : 96,
        }}
      >
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

        {/* Phase 4: loading history indicator (initial load) */}
        {loadingHistory && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 0' }}>
            <Loader2 size={16} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{t('contact.loading_messages')}</span>
          </div>
        )}

        {!selectedCategory && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>{t('contact.choose_topic')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORY_KEYS.map(key => {
                const cat = t(`contact.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => handleCategorySelect(cat)}
                    style={{ padding: '8px 16px', borderRadius: 20, backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 600, color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
                    className="active:scale-95 hover:border-orange-300 hover:text-orange-600"
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messageItems.map(item => {
          if (item.kind === 'divider') {
            return (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: 10 }}>
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
              <div style={{ maxWidth: '78%' }}>
                {(isAgent || isAi) && (
                  <p style={{ fontSize: 11, color: isAgent ? '#10B981' : '#FF6600', fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>
                    {isAi ? 'Evair AI' : (msg.senderName || t('contact.agent_name'))}
                  </p>
                )}
                <div
                  onDoubleClick={() => isFailed && retryFailed(msg)}
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
      </div>

      {/* 跳到最新（浮动按钮，向上滚动后才出现） */}
      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom()}
          style={{
            position: 'absolute',
            right: embedded ? 12 : 16,
            bottom: embedded ? 92 : 104,
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15,
            transition: 'transform 0.2s, opacity 0.2s',
          }}
          aria-label="jump to latest"
        >
          <ArrowDown size={18} color="#475569" />
        </button>
      )}

      {/* Phase 3: Input — viewport-fixed in-app; embedded = in-flow inside marketing widget */}
      <div
        style={
          embedded
            ? {
                position: 'relative',
                flexShrink: 0,
                zIndex: 20,
                padding: '12px 12px max(12px, env(safe-area-inset-bottom, 0px))',
                paddingTop: 10,
                backgroundColor: '#fff',
                borderTop: '1px solid #f1f5f9',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
              }
            : {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                padding: '12px 16px 32px',
                backgroundColor: '#fff',
                borderTop: '1px solid #f1f5f9',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
              }
        }
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, backgroundColor: '#f8fafc', borderRadius: 20, padding: '6px 6px 6px 16px', border: '1px solid #e2e8f0' }}>
          {/* Phase 2: Paperclip opens attach menu, disabled only when uploading */}
          <button
            onClick={() => setAttachMenuOpen(true)}
            disabled={uploading}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0, marginBottom: 2, opacity: uploading ? 0.4 : 1, transition: 'opacity 0.15s' }}
          >
            <Paperclip size={18} color="#94a3b8" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('contact.type_message')}
            rows={1}
            style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', backgroundColor: 'transparent', fontSize: 15, lineHeight: 1.5, color: '#1e293b', padding: '6px 0', maxHeight: 100, fontFamily: 'Inter, sans-serif' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || uploading}
            style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: input.trim() && !uploading ? '#FF6600' : '#e2e8f0', border: 'none', cursor: input.trim() && !uploading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s', boxShadow: input.trim() && !uploading ? '0 2px 8px rgba(255,102,0,0.3)' : 'none' }}
          >
            {/* Phase 2: show spinner when uploading */}
            {uploading
              ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
            }
          </button>
        </div>
      </div>

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
