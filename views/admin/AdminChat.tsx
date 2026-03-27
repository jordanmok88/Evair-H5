import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, MessageSquare, Loader2, Circle, User, Globe, Zap } from 'lucide-react';
import {
  DbConversation,
  DbChatMessage,
  supabaseConfigured,
  adminFetchConversations,
  adminResolveConversation,
  getMessages,
  sendMessage,
  subscribeToMessages,
  subscribeToConversations,
} from '../../services/supabase';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  needs_human: { bg: 'bg-red-100', text: 'text-red-700', label: 'Needs Agent' },
  open: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Open' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
};

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

const DEMO_CONVERSATIONS: DbConversation[] = [
  { id: 'demo-c1', customer_id: 'a1b2c3d4-ef56-7890-abcd-ef1234567890', customer_name: 'Sarah Chen', status: 'needs_human', topic: 'SIM Activation', created_at: hoursAgo(2), updated_at: hoursAgo(1) },
  { id: 'demo-c2', customer_id: 'b2c3d4e5-fg67-8901-bcde-f12345678901', customer_name: 'Mike Johnson', status: 'open', topic: 'Data Top-Up', created_at: hoursAgo(24), updated_at: hoursAgo(20) },
  { id: 'demo-c3', customer_id: 'c3d4e5f6-gh78-9012-cdef-123456789012', customer_name: 'Guest', status: 'resolved', topic: 'Billing Issue', created_at: hoursAgo(72), updated_at: hoursAgo(70) },
];

const DEMO_MESSAGES: Record<string, DbChatMessage[]> = {
  'demo-c1': [
    { id: 'dm1', conversation_id: 'demo-c1', sender: 'customer', agent_name: null, content: '我需要帮助激活SIM卡', english_content: 'I need help activating my SIM card', created_at: hoursAgo(2) },
    { id: 'dm2', conversation_id: 'demo-c1', sender: 'ai', agent_name: null, content: '激活您的 EvairSIM：\n\n📱 eSIM：购买后，前往 设置 > 蜂窝网络 > 添加 eSIM，然后扫描二维码。\n\n💳 实体 SIM 卡：将卡插入手机，打开 Evair 应用输入 ICCID 号码。', english_content: 'To activate your EvairSIM:\n\n📱 eSIM: After purchase, go to Settings > Cellular > Add eSIM, then scan the QR code.\n\n💳 Physical SIM: Insert the card, then enter your ICCID in the Evair app.', created_at: hoursAgo(2) },
    { id: 'dm3', conversation_id: 'demo-c1', sender: 'customer', agent_name: null, content: '我扫描了二维码但是显示"无法激活"，我可以找真人客服吗？', english_content: 'I scanned the QR code but it says "Cannot Activate" — can I speak to a real person?', created_at: hoursAgo(1.5) },
    { id: 'dm4', conversation_id: 'demo-c1', sender: 'ai', agent_name: null, content: '我理解您想与人工客服交流。🙋‍♂️\n\n已为您转接到客服团队。', english_content: "I understand you'd like to speak with a human agent. 🙋‍♂️\n\nI've flagged your conversation for our support team.", created_at: hoursAgo(1) },
  ],
  'demo-c2': [
    { id: 'dm5', conversation_id: 'demo-c2', sender: 'customer', agent_name: null, content: 'I need help with: Data Top-Up', english_content: null, created_at: hoursAgo(24) },
    { id: 'dm6', conversation_id: 'demo-c2', sender: 'ai', agent_name: null, content: 'You can check and manage your data in the Evair app:\n\n📊 Check remaining data: Go to My eSIMs/SIMs tab.\n\n➕ Top up: Tap "Add Data" on your active SIM.', english_content: null, created_at: hoursAgo(23.5) },
    { id: 'dm7', conversation_id: 'demo-c2', sender: 'customer', agent_name: null, content: 'Thanks, how do I know when my data is about to run out?', english_content: null, created_at: hoursAgo(20) },
  ],
  'demo-c3': [
    { id: 'dm8', conversation_id: 'demo-c3', sender: 'customer', agent_name: null, content: '我被重复扣费了，订单号 ORD-123', english_content: 'I was charged twice for my order ORD-123', created_at: hoursAgo(72) },
    { id: 'dm9', conversation_id: 'demo-c3', sender: 'ai', agent_name: null, content: '很抱歉听到重复扣费的问题。让我为您转接到账单团队。', english_content: "I'm sorry to hear about the double charge. Let me connect you with our billing team.", created_at: hoursAgo(71.5) },
    { id: 'dm10', conversation_id: 'demo-c3', sender: 'agent', agent_name: 'Jordan', content: 'Hi! I\'ve checked your account and I can see the duplicate charge. I\'ve initiated a refund — you should see it within 3-5 business days. Sorry for the inconvenience!', english_content: null, created_at: hoursAgo(70) },
  ],
};

const SUGGESTED_REPLIES = [
  "Hi! I'm looking into your issue now. Please give me a moment.",
  "I've checked your account and everything looks good. Is there anything else I can help with?",
  "I've initiated a refund for you — it should appear within 3-5 business days.",
  "Could you please share your ICCID or order number so I can look into this?",
  "I've resolved the issue. Please restart your device and try again.",
  "I'm escalating this to our technical team. We'll follow up within 24 hours.",
];

const AdminChat: React.FC = () => {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DbChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const convChannelRef = useRef<any>(null);

  const isDemoMode = !supabaseConfigured;

  const load = async () => {
    setLoading(true);
    if (isDemoMode) {
      setConversations(DEMO_CONVERSATIONS);
    } else {
      const data = await adminFetchConversations();
      setConversations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!isDemoMode) {
      const ch = subscribeToConversations((conv) => {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === conv.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = conv;
            return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          }
          return [conv, ...prev];
        });
      });
      convChannelRef.current = ch;
    }
    return () => {
      convChannelRef.current?.unsubscribe();
      channelRef.current?.unsubscribe();
    };
  }, []);

  const selectConversation = async (conv: DbConversation) => {
    setSelectedId(conv.id);
    setMsgLoading(true);

    if (isDemoMode) {
      setMessages(DEMO_MESSAGES[conv.id] || []);
    } else {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      channelRef.current?.unsubscribe();
      const ch = subscribeToMessages(conv.id, (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
      channelRef.current = ch;
    }
    setMsgLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    const newMsg: DbChatMessage = {
      id: `agent-${Date.now()}`,
      conversation_id: selectedId,
      sender: 'agent',
      agent_name: 'Admin',
      content: replyText.trim(),
      created_at: new Date().toISOString(),
    };

    if (isDemoMode) {
      setMessages(prev => [...prev, newMsg]);
    } else {
      await sendMessage(selectedId, 'agent', replyText.trim(), 'Admin');
      setMessages(prev => [...prev, newMsg]);
    }
    setReplyText('');
    setSending(false);
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    if (isDemoMode) {
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status: 'resolved' as const } : c));
    } else {
      await adminResolveConversation(selectedId);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status: 'resolved' as const } : c));
    }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffH = (now.getTime() - date.getTime()) / 3600000;
    if (diffH < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const selectedConv = conversations.find(c => c.id === selectedId);

  return (
    <div className="flex h-screen">
      {/* Conversations List */}
      <div className="w-80 bg-white border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Conversations</h2>
          <p className="text-xs text-slate-400 mt-0.5">{conversations.length} total</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-6">
              <MessageSquare size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => {
              const status = STATUS_COLORS[conv.status] || STATUS_COLORS.open;
              const isSelected = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-50 transition-colors ${isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={14} className="text-slate-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                        {conv.customer_name || 'Guest'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{formatTime(conv.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-10">
                    {conv.topic && <span className="text-xs text-slate-500 truncate">{conv.topic}</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <MessageSquare size={40} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">Select a conversation</h3>
              <p className="text-sm text-slate-400 mt-1">Click on a conversation from the left panel to view and reply.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  {selectedConv?.customer_name || 'Guest'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedConv?.topic && <span className="text-xs text-slate-500">{selectedConv.topic}</span>}
                  {selectedConv && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[selectedConv.status]?.bg} ${STATUS_COLORS[selectedConv.status]?.text}`}>
                      {STATUS_COLORS[selectedConv.status]?.label}
                    </span>
                  )}
                </div>
              </div>
              {selectedConv?.status !== 'resolved' && (
                <button
                  onClick={handleResolve}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-600 text-sm font-semibold hover:bg-green-100 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  Resolve
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50">
              {msgLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : (
                messages.map(msg => {
                  const isCustomer = msg.sender === 'customer';
                  const isAgent = msg.sender === 'agent';
                  const isAI = msg.sender === 'ai';
                  const hasTranslation = msg.english_content && msg.english_content !== msg.content;
                  return (
                    <div key={msg.id} className={`flex mb-4 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[70%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isCustomer && <Circle size={8} className="text-blue-400 fill-blue-400" />}
                          {isAI && <Circle size={8} className="text-orange-400 fill-orange-400" />}
                          {isAgent && <Circle size={8} className="text-green-400 fill-green-400" />}
                          <span className="text-[11px] font-semibold text-slate-500">
                            {isCustomer ? (selectedConv?.customer_name || 'Customer') : isAI ? 'AI Bot' : msg.agent_name || 'Agent'}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isCustomer ? 'bg-white border border-slate-100 text-slate-800' :
                          isAgent ? 'bg-green-500 text-white' :
                          'bg-orange-50 border border-orange-100 text-slate-700'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {hasTranslation && (
                          <div className="mt-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-[12px] text-blue-700 leading-relaxed">
                            <div className="flex items-center gap-1 mb-0.5 text-[10px] font-bold text-blue-400 uppercase">
                              <Globe size={10} /> English
                            </div>
                            <p className="whitespace-pre-wrap">{msg.english_content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Box */}
            {selectedConv?.status !== 'resolved' && (
              <div className="border-t border-slate-100 bg-white">
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Replies</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_REPLIES.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => setReplyText(reply)}
                        className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-600 font-medium hover:bg-orange-50 hover:text-orange-600 transition-colors truncate max-w-[280px]"
                      >
                        {reply.length > 50 ? reply.slice(0, 50) + '...' : reply}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 pt-2">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      placeholder="Type your reply as an agent..."
                      rows={2}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim() || sending}
                      className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-orange-600 active:scale-95 transition-all"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Your reply will appear as "Admin" to the customer in real-time.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
