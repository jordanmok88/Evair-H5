/**
 * Supabase chat provider
 *
 * 把原 services/supabase.ts 里 chat / conversation 段封装为
 * ChatProvider 接口实现，使 ContactUsView 不再直接依赖 supabase-js。
 *
 * 行为与原实现保持一致（避免对线上现网造成任何回归）：
 * - 客户身份用 localStorage 中的匿名 UUID（evair-customer-id）
 * - 实时通过 supabase.channel(...).postgres_changes INSERT 订阅
 * - 已读 / 未读：Supabase 端无后端字段，markRead 仅本地清理
 */

import {
  supabase,
  supabaseConfigured,
  createConversation as sbCreateConversation,
  getCustomerConversation as sbGetCustomerConversation,
  sendMessage as sbSendMessage,
  getMessages as sbGetMessages,
  markNeedsHuman as sbMarkNeedsHuman,
  subscribeToMessages as sbSubscribeToMessages,
  DbChatMessage,
} from '../supabase';
import type {
  ChatProvider,
  ChatProviderListener,
  ConnectionState,
  ConversationHandle,
  EnsureConversationInput,
  SendMessageInput,
  UnifiedChatMessage,
} from './types';

function dbToUnified(m: DbChatMessage, conversationId: string): UnifiedChatMessage {
  return {
    id: m.id,
    conversationId,
    sender: m.sender,
    senderName: m.agent_name ?? undefined,
    text: m.content,
    englishText: m.english_content ?? undefined,
    messageType: 'text',
    timestamp: new Date(m.created_at),
    // Supabase 路径未维护 is_read，进入会话默认视为已读
    status: m.sender === 'customer' ? 'read' : 'read',
  };
}

export function createSupabaseProvider(): ChatProvider {
  let conversationId: string | null = null;
  let channelDispose: (() => void) | null = null;
  const listeners = new Set<ChatProviderListener>();
  let connectionState: ConnectionState = 'idle';

  const setConnection = (state: ConnectionState) => {
    if (connectionState === state) return;
    connectionState = state;
    listeners.forEach(l => l.onConnectionChange?.(state));
  };

  const setupRealtime = (convId: string) => {
    channelDispose?.();
    setConnection('connecting');
    const ch = sbSubscribeToMessages(convId, msg => {
      // 只外推 agent 消息——customer / ai 由发送方本地添加，避免重复
      if (msg.sender !== 'agent') return;
      const unified = dbToUnified(msg, convId);
      listeners.forEach(l => l.onMessage?.(unified));
    });
    if (!ch) {
      setConnection('offline');
      channelDispose = null;
      return;
    }
    setConnection('connected');
    channelDispose = () => {
      try { ch.unsubscribe(); } catch { /* ignore */ }
    };
  };

  return {
    name: 'supabase',

    isReady() {
      return supabaseConfigured;
    },

    async ensureConversation(input?: EnsureConversationInput): Promise<ConversationHandle> {
      if (!supabaseConfigured) {
        // 配置缺失时仍返回一个本地 ID，让 UI 可用但消息不会持久化
        const fakeId = `local-${Date.now()}`;
        conversationId = fakeId;
        return { id: fakeId, status: 'open', existing: false };
      }

      const existing = await sbGetCustomerConversation();
      if (existing) {
        conversationId = existing.id;
        setupRealtime(existing.id);
        return {
          id: existing.id,
          status: existing.status === 'needs_human' ? 'needs_agent' : (existing.status as 'open' | 'resolved'),
          existing: true,
        };
      }

      const created = await sbCreateConversation(input?.topic, input?.customerName);
      if (!created) {
        const fakeId = `local-${Date.now()}`;
        conversationId = fakeId;
        return { id: fakeId, status: 'open', existing: false };
      }
      conversationId = created.id;
      setupRealtime(created.id);
      return {
        id: created.id,
        status: created.status === 'needs_human' ? 'needs_agent' : (created.status as 'open' | 'resolved'),
        existing: false,
      };
    },

    async fetchMessages(): Promise<UnifiedChatMessage[]> {
      if (!conversationId || conversationId.startsWith('local-')) return [];
      const rows = await sbGetMessages(conversationId);
      return rows.map(r => dbToUnified(r, conversationId!));
    },

    async send(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      // local 桩
      if (conversationId.startsWith('local-')) {
        return {
          id: input.clientMsgId,
          conversationId,
          sender: 'customer',
          text: input.text,
          messageType: input.messageType ?? 'text',
          mediaUrl: input.mediaUrl,
          metadata: input.metadata,
          timestamp: new Date(),
          status: 'sent',
          clientMsgId: input.clientMsgId,
        };
      }
      const row = await sbSendMessage(
        conversationId,
        'customer',
        input.text,
        undefined,
        input.englishText,
      );
      if (!row) throw new Error('send failed');
      return { ...dbToUnified(row, conversationId), status: 'sent' };
    },

    async sendAi(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      if (conversationId.startsWith('local-')) {
        return {
          id: input.clientMsgId,
          conversationId,
          sender: 'ai',
          text: input.text,
          messageType: 'text',
          metadata: input.metadata,
          timestamp: new Date(),
          status: 'sent',
          clientMsgId: input.clientMsgId,
        };
      }
      const row = await sbSendMessage(
        conversationId,
        'ai',
        input.text,
        undefined,
        input.englishText,
      );
      if (!row) throw new Error('ai send failed');
      return { ...dbToUnified(row, conversationId), status: 'sent' };
    },

    async markNeedsHuman(): Promise<void> {
      if (!conversationId || conversationId.startsWith('local-')) return;
      await sbMarkNeedsHuman(conversationId);
    },

    async markRead(): Promise<void> {
      // Supabase 路径未维护 is_read 列，无需远程操作
    },

    subscribe(listener: ChatProviderListener): () => void {
      listeners.add(listener);
      // 立刻同步当前连接状态，避免订阅时机错过
      listener.onConnectionChange?.(connectionState);
      return () => listeners.delete(listener);
    },

    dispose(): void {
      channelDispose?.();
      channelDispose = null;
      listeners.clear();
      conversationId = null;
      setConnection('idle');
    },
  };
}

// 仅供调试 / 测试
export const __supabaseInternals = { supabase };
