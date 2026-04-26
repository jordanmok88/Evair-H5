import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Paperclip, CheckCheck, Bot, Sparkles, AlertCircle, ArrowDown, Wifi, WifiOff, Headphones } from 'lucide-react';
import { getMultilingualResponse } from '../ai/evairAssistant';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import LiveChatView from './LiveChatView';
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

const ContactUsView: React.FC<ContactUsViewProps> = ({ onBack, userName = 'Jordan' }) => {
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
  /** 转人工：全屏 LiveChatView（useChat + Echo），返回后仍保留上方 AI 会话 */
  const [showLiveChat, setShowLiveChat] = useState(false);
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
  const isLaravelMode = providerName === 'laravel';

  // 草稿持久化
  useEffect(() => {
    try {
      if (input) localStorage.setItem(DRAFT_KEY, input);
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
  }, [input]);

  // 初始化 provider + 加载会话
  //
  // 关键：不使用 initialized.current guard。
  // React StrictMode 在开发模式下执行 Effect→Cleanup→Effect 双调用序列。
  // 如果用 guard，第一次 Effect 的 cleanup 会把 providerRef 清空，
  // 第二次 Effect 又因 guard 跳过 → providerRef 永远为 null → 发消息无效。
  // 改用 cancelled 标志防竞态，让每次 Effect 都能正确完成初始化。
  useEffect(() => {
    let cancelled = false;

    const provider = acquireSharedChatProvider();
    providerRef.current = provider;

    const unsubscribe = provider.subscribe({
      onMessage: incoming => {
        if (cancelled) return;
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id || (incoming.clientMsgId && m.clientMsgId === incoming.clientMsgId))) {
            return prev;
          }
          return [...prev, incoming];
        });
        if (incoming.sender === 'agent') {
          provider.markRead().catch(() => { /* noop */ });
        }
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
          const history = await provider.fetchMessages();
          if (cancelled) return;
          setMessages(history);
          provider.markRead().catch(() => { /* noop */ });
          return;
        }
        setMessages([
          { id: 'welcome-1', conversationId: handle.id, sender: 'ai', text: t('contact.welcome_msg'), messageType: 'text', timestamp: new Date(Date.now() - 60000), status: 'read', senderName: 'Evair AI' },
          { id: 'welcome-2', conversationId: handle.id, sender: 'ai', text: t('contact.welcome_msg2'), messageType: 'text', timestamp: new Date(Date.now() - 55000), status: 'read', senderName: 'Evair AI' },
        ]);
      } catch (err) {
        if (cancelled) return;
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
      // send 失败时不跳转人工，让用户看到失败状态后决定是否重试
      return;
    }

    if (isHumanRequest) {
      provider.markNeedsHuman().catch(() => { /* noop */ });
      setShowLiveChat(true);
      return;
    }

    if (!opts?.skipAi) {
      triggerAiReply(provider, text);
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

  // 富媒体渲染：image / order / product
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
    if (msg.messageType === 'order' && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>;
      return (
        <div style={{ minWidth: 220, padding: 4 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('contact.order_card')}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: isCustomer ? '#fff' : '#1e293b' }}>#{String(meta.order_no ?? meta.id ?? '-')}</p>
          {meta.title ? <p style={{ fontSize: 13, marginTop: 2 }}>{String(meta.title)}</p> : null}
          {meta.amount ? <p style={{ fontSize: 13, marginTop: 2, fontWeight: 600 }}>{String(meta.amount)}</p> : null}
        </div>
      );
    }
    if (msg.messageType === 'product' && msg.metadata) {
      const meta = msg.metadata as Record<string, unknown>;
      return (
        <div style={{ minWidth: 220, padding: 4 }}>
          <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('contact.product_card')}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: isCustomer ? '#fff' : '#1e293b' }}>{String(meta.name ?? '-')}</p>
          {meta.price ? <p style={{ fontSize: 13, marginTop: 2, fontWeight: 600 }}>{String(meta.price)}</p> : null}
        </div>
      );
    }
    return isCustomer ? msg.text : <RichText text={msg.text} />;
  };

  // 在 messages 中插入日期分隔条
  const messageItems = useMemo(() => {
    const items: Array<{ kind: 'divider'; key: string; label: string } | { kind: 'msg'; key: string; msg: UnifiedChatMessage }> = [];
    let prev: UnifiedChatMessage | null = null;
    for (const m of messages) {
      if (!prev || !sameDay(prev.timestamp, m.timestamp)) {
        items.push({ kind: 'divider', key: `d-${m.timestamp.toDateString()}`, label: formatDateLabel(m.timestamp, t) });
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

  if (showLiveChat) {
    return <LiveChatView onBack={() => setShowLiveChat(false)} />;
  }

  return (
    <div className="lg:h-full min-h-screen lg:min-h-0 flex flex-col bg-[#F2F4F7] relative">
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
              <span className="text-sm text-white/85 font-medium">{t('contact.online_status')}</span>
            </div>
          </div>
          <button
            onClick={() => setShowLiveChat(true)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
            aria-label={t('contact.talk_to_human', { defaultValue: 'Talk to a human' })}
            title={t('contact.talk_to_human', { defaultValue: 'Talk to a human' })}
          >
            <Headphones size={18} color="#fff" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center gap-3 ml-12">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Sparkles size={16} color="#FF6600" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#FF6600] flex items-center justify-center">
              <Bot size={8} color="#fff" strokeWidth={3} />
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Evair AI Assistant</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-white/70 font-medium">Powered by AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 网络状态条：仅在非 connected 时显示，浮动不挤占布局 */}
      {connectionLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', backgroundColor: connection === 'offline' ? '#FEF3C7' : '#FEF9C3', color: '#854D0E', fontSize: 12, fontWeight: 600 }}>
          {connection === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
          {connectionLabel}
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 pb-4" style={{ scrollBehavior: 'smooth' }}>
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
            <div key={item.key} style={{ display: 'flex', justifyContent: isCustomer ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {!isCustomer && (
                <div style={{ width: 28, height: 28, borderRadius: 10, background: isAgent ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #FF6600, #FF8533)', flexShrink: 0, marginRight: 8, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {isAgent && msg.senderAvatar
                    ? <img src={msg.senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Sparkles size={14} color="#fff" />}
                </div>
              )}
              <div style={{ maxWidth: '78%' }}>
                {(isAgent || isAi) && (
                  <p style={{ fontSize: 11, color: isAgent ? '#10B981' : '#FF6600', fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>
                    {isAi ? 'Evair AI' : (msg.senderName || 'Support')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: 'linear-gradient(135deg, #FF6600, #FF8533)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color="#fff" />
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
          style={{ position: 'absolute', right: 16, bottom: 96, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}
          aria-label="jump to latest"
        >
          <ArrowDown size={18} color="#475569" />
        </button>
      )}

      {/* Input Area */}
      <div style={{ padding: '12px 16px 32px', backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, backgroundColor: '#f8fafc', borderRadius: 20, padding: '6px 6px 6px 16px', border: '1px solid #e2e8f0' }}>
          <button
            title={isLaravelMode ? t('contact.attach_unavailable') : ''}
            disabled={isLaravelMode}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: isLaravelMode ? 'not-allowed' : 'pointer', flexShrink: 0, marginBottom: 2, opacity: isLaravelMode ? 0.4 : 1 }}
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
            disabled={!input.trim()}
            style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: input.trim() ? '#FF6600' : '#e2e8f0', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s', boxShadow: input.trim() ? '0 2px 8px rgba(255,102,0,0.3)' : 'none' }}
          >
            <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* 图片灯箱 */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, cursor: 'zoom-out' }}
        >
          <img src={lightboxUrl} alt="" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }} />
        </div>
      )}

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ContactUsView;
