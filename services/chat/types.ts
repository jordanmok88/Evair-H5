/**
 * Unified chat types — provider-agnostic
 *
 * 统一三个 provider（Supabase / Laravel / Local）的消息形状，
 * 让 ContactUsView 只对接 ChatProvider 接口，不感知后端差异。
 *
 * UnifiedChatMessage 是 H5 自有的 ChatMessage 的超集：
 * - 现有 `text/sender/timestamp/status/agentName` 字段保留语义
 * - 新增 messageType / mediaUrl / metadata / englishText / clientMsgId
 *   对应 Laravel 后端 chat_messages 表已有列，Supabase 模式按需填充
 */

export type ChatProviderName = 'supabase' | 'laravel' | 'local';

export type ChatMessageType = 'text' | 'image' | 'file' | 'order' | 'product';

export type ChatMessageSender = 'customer' | 'ai' | 'agent';

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface UnifiedChatMessage {
  id: string;
  conversationId: string;
  sender: ChatMessageSender;
  senderName?: string;
  senderAvatar?: string;
  text: string;
  englishText?: string;
  messageType: ChatMessageType;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  status: ChatMessageStatus;
  clientMsgId?: string;
}

export interface SendMessageInput {
  text: string;
  englishText?: string;
  messageType?: ChatMessageType;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  clientMsgId: string;
}

export interface EnsureConversationInput {
  topic?: string;
  customerName?: string;
  customerEmail?: string;
  language?: string;
}

export interface ConversationHandle {
  id: string;
  status: 'open' | 'needs_agent' | 'resolved';
  /** 标识本次 ensure 是命中已有会话还是新建 */
  existing: boolean;
}

export interface ChatProviderListener {
  onMessage?(msg: UnifiedChatMessage): void;
  onConnectionChange?(state: ConnectionState): void;
}

export interface ChatProvider {
  readonly name: ChatProviderName;
  /**
   * 是否已经具备工作所需的认证 / 配置（用于 auto 决策）
   */
  isReady(): boolean;
  ensureConversation(input?: EnsureConversationInput): Promise<ConversationHandle>;
  fetchMessages(opts?: { since?: Date }): Promise<UnifiedChatMessage[]>;
  /**
   * 发送 customer 消息。注意：返回值是后端确认后的最终消息；
   * 失败应抛出，由调用方决定 optimistic UI 的回退/重试。
   */
  send(input: SendMessageInput): Promise<UnifiedChatMessage>;
  /**
   * 持久化 AI 自动回复。Laravel 模式走专属接口；
   * Supabase / Local 模式可降级为本地内存或 sender=ai 入库。
   */
  sendAi(input: SendMessageInput): Promise<UnifiedChatMessage>;
  markNeedsHuman(): Promise<void>;
  markRead(): Promise<void>;
  /**
   * 订阅实时消息（agent / 跨端 customer）。
   * 返回 dispose 函数；多次调用可累积监听器。
   */
  subscribe(listener: ChatProviderListener): () => void;
  /** 释放底层资源（关闭 ws、取消订阅） */
  dispose(): void;
}
