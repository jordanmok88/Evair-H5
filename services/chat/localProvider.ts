/**
 * Local-only chat provider
 *
 * 既无 Supabase 也无 Laravel 配置时的兜底：仅在内存中维持会话，
 * 让用户与本地 AI 助手对话不至于报错。刷新页面会丢失记录，
 * 这是有意为之——避免给用户一种"已发送给客服"的错觉。
 */

import type {
  ChatProvider,
  ChatProviderListener,
  ConnectionState,
  ConversationHandle,
  EnsureConversationInput,
  SendMessageInput,
  UnifiedChatMessage,
} from './types';

export function createLocalProvider(): ChatProvider {
  let conversationId: string | null = null;
  const messages: UnifiedChatMessage[] = [];
  const listeners = new Set<ChatProviderListener>();
  let connectionState: ConnectionState = 'offline';

  const setConnection = (state: ConnectionState) => {
    connectionState = state;
    listeners.forEach(l => l.onConnectionChange?.(state));
  };

  return {
    name: 'local',
    isReady() { return true; },

    async ensureConversation(_input?: EnsureConversationInput): Promise<ConversationHandle> {
      conversationId = `local-${Date.now()}`;
      setConnection('offline');
      return { id: conversationId, status: 'open', existing: false };
    },

    async fetchMessages(): Promise<UnifiedChatMessage[]> {
      return [...messages];
    },

    async send(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      const msg: UnifiedChatMessage = {
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
      messages.push(msg);
      return msg;
    },

    async sendAi(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      const msg: UnifiedChatMessage = {
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
      messages.push(msg);
      return msg;
    },

    async markNeedsHuman(): Promise<void> { /* noop */ },
    async markRead(): Promise<void> { /* noop */ },

    subscribe(listener: ChatProviderListener): () => void {
      listeners.add(listener);
      listener.onConnectionChange?.(connectionState);
      return () => listeners.delete(listener);
    },

    dispose(): void {
      listeners.clear();
      messages.length = 0;
      conversationId = null;
    },
  };
}
