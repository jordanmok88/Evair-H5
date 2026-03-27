import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Paperclip, CheckCheck, Bot, Sparkles } from 'lucide-react';
import { getAIResponse } from '../ai/evairAssistant';
import { ChatMessage } from '../types';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import {
  supabaseConfigured,
  createConversation,
  getCustomerConversation,
  sendMessage as sbSend,
  getMessages,
  markNeedsHuman,
  subscribeToMessages,
  DbChatMessage,
} from '../services/supabase';

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

const HUMAN_KEYWORDS = /\b(human|agent|real person|speak to someone|talk to person|live chat|representative|operator|transfer)\b/i;

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const channelRef = useRef<any>(null);

  // Initialize: load existing conversation or show welcome
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      if (supabaseConfigured) {
        const existing = await getCustomerConversation();
        if (existing) {
          setConversationId(existing.id);
          const msgs = await getMessages(existing.id);
          setMessages(msgs.map(dbToLocal));
          if (existing.topic) setSelectedCategory(existing.topic);
          setupRealtime(existing.id);
          return;
        }
      }
      // No existing conversation — show welcome messages
      setMessages([
        { id: 'welcome-1', text: t('contact.welcome_msg'), sender: 'ai', timestamp: new Date(Date.now() - 60000) },
        { id: 'welcome-2', text: t('contact.welcome_msg2'), sender: 'ai', timestamp: new Date(Date.now() - 55000) },
      ]);
    };
    init();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [t]);

  function dbToLocal(m: DbChatMessage): ChatMessage {
    return {
      id: m.id,
      text: m.content,
      sender: m.sender,
      agentName: m.agent_name ?? undefined,
      timestamp: new Date(m.created_at),
      status: 'read',
    };
  }

  function setupRealtime(convId: string) {
    channelRef.current?.unsubscribe();
    const ch = subscribeToMessages(convId, (msg) => {
      // Only add messages from agents (AI & customer messages are added locally)
      if (msg.sender === 'agent') {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, dbToLocal(msg)];
        });
      }
    });
    channelRef.current = ch;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  async function ensureConversation(topic?: string): Promise<string> {
    if (conversationId) return conversationId;
    if (!supabaseConfigured) {
      const fakeId = `local-${Date.now()}`;
      setConversationId(fakeId);
      return fakeId;
    }
    const conv = await createConversation(topic, userName);
    if (conv) {
      setConversationId(conv.id);
      setupRealtime(conv.id);
      return conv.id;
    }
    const fakeId = `local-${Date.now()}`;
    setConversationId(fakeId);
    return fakeId;
  }

  const addMessage = async (text: string, sender: 'customer' | 'ai', convId: string) => {
    const msg: ChatMessage = {
      id: `${sender}-${Date.now()}-${Math.random()}`,
      text,
      sender,
      timestamp: new Date(),
      status: sender === 'customer' ? 'sent' : 'read',
    };
    setMessages(prev => [...prev, msg]);

    if (supabaseConfigured && !convId.startsWith('local-')) {
      await sbSend(convId, sender, text);
    }

    return msg;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');

    const convId = await ensureConversation();
    const userMsg = await addMessage(trimmed, 'customer', convId);

    // Mark as delivered
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'delivered' } : m));
    }, 800);

    // Check if customer wants a human agent
    if (HUMAN_KEYWORDS.test(trimmed)) {
      if (supabaseConfigured && !convId.startsWith('local-')) {
        await markNeedsHuman(convId);
      }
    }

    // AI responds
    const aiReply = getAIResponse(trimmed);
    const typingDelay = Math.min(1200 + aiReply.length * 8, 3000);

    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      await addMessage(aiReply, 'ai', convId);
      setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'read' } : m));
    }, typingDelay);
  };

  const handleCategorySelect = async (cat: string) => {
    setSelectedCategory(cat);
    const convId = await ensureConversation(cat);
    await addMessage(`${t('contact.need_help_with')} ${cat}`, 'customer', convId);

    const aiReply = getAIResponse(cat);
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      await addMessage(aiReply, 'ai', convId);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 pb-4" style={{ scrollBehavior: 'smooth' }}>
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

        {messages.map((msg) => {
          const isCustomer = msg.sender === 'customer';
          const isAgent = msg.sender === 'agent';
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isCustomer ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {!isCustomer && (
                <div style={{ width: 28, height: 28, borderRadius: 10, background: isAgent ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #FF6600, #FF8533)', flexShrink: 0, marginRight: 8, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={14} color="#fff" />
                </div>
              )}
              <div style={{ maxWidth: '78%' }}>
                {isAgent && msg.agentName && (
                  <p style={{ fontSize: 11, color: '#10B981', fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>{msg.agentName}</p>
                )}
                <div style={{ padding: '12px 16px', borderRadius: isCustomer ? '18px 18px 4px 18px' : '18px 18px 18px 4px', backgroundColor: isCustomer ? '#FF6600' : '#fff', color: isCustomer ? '#fff' : '#1e293b', fontSize: 15, lineHeight: 1.5, fontWeight: 450, boxShadow: isCustomer ? '0 2px 8px rgba(255,102,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {!isCustomer ? <RichText text={msg.text} /> : msg.text}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isCustomer ? 'flex-end' : 'flex-start', marginTop: 4, paddingLeft: 4, paddingRight: 4 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{formatTime(msg.timestamp)}</span>
                  {isCustomer && msg.status && (
                    <CheckCheck size={13} color={msg.status === 'read' ? '#FF6600' : '#94a3b8'} strokeWidth={2.5} />
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

      {/* Input Area */}
      <div style={{ padding: '12px 16px 32px', backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, backgroundColor: '#f8fafc', borderRadius: 20, padding: '6px 6px 6px 16px', border: '1px solid #e2e8f0' }}>
          <button style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, marginBottom: 2 }}>
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
