import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Paperclip, CheckCheck, Bot, Sparkles } from 'lucide-react';
import { getAIResponse } from '../ai/evairAssistant';

interface ContactUsViewProps {
  onBack: () => void;
  userName?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

const CATEGORY_KEYS = [
  'sim_activation',
  'ecard_help',
  'data_topup',
  'billing_issue',
  'network_problem',
  'other',
] as const;

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMessages([
        { id: 'welcome-1', text: t('contact.welcome_msg'), sender: 'support', timestamp: new Date(Date.now() - 60000) },
        { id: 'welcome-2', text: t('contact.welcome_msg2'), sender: 'support', timestamp: new Date(Date.now() - 55000) },
      ]);
    }
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === userMsg.id ? { ...m, status: 'delivered' } : m)
      );
    }, 800);

    const aiReply = getAIResponse(trimmed);
    const typingDelay = Math.min(1200 + aiReply.length * 8, 3000);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: `ai-${Date.now()}`,
        text: aiReply,
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [
        ...prev.map(m => m.id === userMsg.id ? { ...m, status: 'read' } : m),
        reply,
      ]);
    }, typingDelay);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    const catMsg: Message = {
      id: `user-cat-${Date.now()}`,
      text: `${t('contact.need_help_with')} ${cat}`,
      sender: 'user',
      timestamp: new Date(),
      status: 'delivered',
    };
    setMessages(prev => [...prev, catMsg]);

    const aiReply = getAIResponse(cat);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: `ai-cat-${Date.now()}`,
        text: aiReply,
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, reply]);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7] relative">

      {/* Header */}
      <div style={{
        paddingTop: 50, paddingBottom: 14, paddingLeft: 16, paddingRight: 16,
        background: 'linear-gradient(180deg, #FF6600 0%, #FF8533 100%)',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 4px 20px rgba(255, 102, 0, 0.25)',
        position: 'relative', zIndex: 10,
      }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
          >
            <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              {t('contact.title')}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4ADE80' }} />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                {t('contact.online_status')}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar row */}
        <div className="flex items-center gap-3 ml-12">
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <Sparkles size={18} color="#FF6600" />
            </div>
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 16, height: 16, borderRadius: '50%',
              backgroundColor: '#4ADE80', border: '2px solid #FF6600',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={9} color="#fff" strokeWidth={3} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Evair AI Assistant</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Powered by AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-5 pb-4" style={{ scrollBehavior: 'smooth' }}>

        {/* Category Quick Select */}
        {!selectedCategory && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>
              {t('contact.choose_topic')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORY_KEYS.map(key => {
                const cat = t(`contact.${key}`);
                return (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(cat)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    backgroundColor: '#fff', border: '1px solid #e2e8f0',
                    fontSize: 15, fontWeight: 600, color: '#334155',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s',
                  }}
                  className="active:scale-95 hover:border-orange-300 hover:text-orange-600"
                >
                  {cat}
                </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            {msg.sender === 'support' && (
              <div style={{
                width: 28, height: 28, borderRadius: 10,
                background: 'linear-gradient(135deg, #FF6600, #FF8533)',
                flexShrink: 0, marginRight: 8, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
            )}
            <div style={{ maxWidth: '78%' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: msg.sender === 'user' ? '#FF6600' : '#fff',
                color: msg.sender === 'user' ? '#fff' : '#1e293b',
                fontSize: 15, lineHeight: 1.5, fontWeight: 450,
                boxShadow: msg.sender === 'user'
                  ? '0 2px 8px rgba(255, 102, 0, 0.2)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {msg.sender === 'support' ? <RichText text={msg.text} /> : msg.text}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                marginTop: 4, paddingLeft: 4, paddingRight: 4,
              }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                  {formatTime(msg.timestamp)}
                </span>
                {msg.sender === 'user' && msg.status && (
                  <CheckCheck
                    size={13}
                    color={msg.status === 'read' ? '#FF6600' : '#94a3b8'}
                    strokeWidth={2.5}
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6600, #FF8533)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <div style={{
              padding: '12px 20px', borderRadius: '18px 18px 18px 4px',
              backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 7, height: 7, borderRadius: '50%', backgroundColor: '#94a3b8',
                    animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px 32px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          backgroundColor: '#f8fafc', borderRadius: 20,
          padding: '6px 6px 6px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <button style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
            flexShrink: 0, marginBottom: 2,
          }}>
            <Paperclip size={18} color="#94a3b8" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('contact.type_message')}
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              backgroundColor: 'transparent', fontSize: 15, lineHeight: 1.5,
              color: '#1e293b', padding: '6px 0', maxHeight: 100,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: input.trim() ? '#FF6600' : '#e2e8f0',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background-color 0.2s',
              boxShadow: input.trim() ? '0 2px 8px rgba(255,102,0,0.3)' : 'none',
            }}
          >
            <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Typing animation keyframes */}
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
