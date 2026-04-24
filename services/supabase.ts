import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { AppNotification } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = !!(url && key);

export const supabase: SupabaseClient | null =
  supabaseConfigured ? createClient(url!, key!) : null;

// ─── Notifications ───────────────────────────────────────────────

export interface DbNotification {
  id: string;
  type: 'promo' | 'service';
  title_en: string;
  title_zh: string;
  title_es: string;
  body_en: string;
  body_zh: string;
  body_es: string;
  action_label: string | null;
  action_target: string | null;
  country_code: string | null;
  active: boolean;
  created_at: string;
}

function langField(lang: string): 'en' | 'zh' | 'es' {
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

export function dbNotifToApp(n: DbNotification, lang: string): AppNotification {
  const l = langField(lang);
  return {
    id: n.id,
    type: n.type,
    titleKey: `__raw:${n[`title_${l}`] || n.title_en}`,
    bodyKey: `__raw:${n[`body_${l}`] || n.body_en}`,
    date: n.created_at,
    read: false,
    actionLabel: n.action_label ? `__raw:${n.action_label}` : undefined,
    countryCode: n.country_code ?? undefined,
  };
}

export async function fetchNotifications(lang: string): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as DbNotification[]).map(n => dbNotifToApp(n, lang));
}

// ─── SIM Activation Logging ─────────────────────────────────────

export async function logSimActivation(activation: {
  iccid: string;
  device: string;
  user_agent: string;
}): Promise<void> {
  if (!supabase) return;
  const batchLookup = await supabase.rpc('lookup_batch_by_iccid', { p_iccid: activation.iccid });
  const batch = batchLookup.data?.[0] ?? null;

  await supabase.from('sim_activations').insert({
    iccid: activation.iccid,
    batch_id: batch?.batch_id ?? null,
    channel: batch?.channel ?? null,
    device: activation.device,
    user_agent: activation.user_agent,
  });
}

// ─── Chat / Conversations (Customer-facing) ─────────────────────

export interface DbConversation {
  id: string;
  customer_id: string;
  customer_name: string | null;
  status: 'open' | 'needs_human' | 'resolved';
  topic: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  conversation_id: string;
  sender: 'customer' | 'ai' | 'agent';
  agent_name: string | null;
  content: string;
  english_content: string | null;
  created_at: string;
}

function getCustomerId(): string {
  let cid = localStorage.getItem('evair-customer-id');
  if (!cid) {
    cid = crypto.randomUUID();
    localStorage.setItem('evair-customer-id', cid);
  }
  return cid;
}

export function getOrCreateCustomerId(): string {
  return getCustomerId();
}

export async function createConversation(topic?: string, customerName?: string): Promise<DbConversation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ customer_id: getCustomerId(), customer_name: customerName || 'Guest', topic, status: 'open' })
    .select()
    .single();
  if (error) return null;
  return data as DbConversation;
}

export async function getCustomerConversation(): Promise<DbConversation | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('customer_id', getCustomerId())
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data as DbConversation | null;
}

export async function sendMessage(
  conversationId: string,
  sender: 'customer' | 'ai' | 'agent',
  content: string,
  agentName?: string,
  englishContent?: string,
): Promise<DbChatMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ conversation_id: conversationId, sender, content, agent_name: agentName ?? null, english_content: englishContent ?? null })
    .select()
    .single();
  if (error) return null;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as DbChatMessage;
}

export async function getMessages(conversationId: string): Promise<DbChatMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return (data ?? []) as DbChatMessage[];
}

export async function markNeedsHuman(conversationId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('conversations')
    .update({ status: 'needs_human', updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: DbChatMessage) => void,
): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as DbChatMessage),
    )
    .subscribe();
}
