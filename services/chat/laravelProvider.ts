/**
 * Laravel chat provider
 *
 * 走 Laravel 后端 /api/v1/app/conversations* 接口 + Reverb 实时频道。
 *
 * 设计要点：
 * 1. 直接 fetch 而非复用 services/api/client 的 request()，原因是 chat 模块
 *    后端响应用 code:"200"（字符串），与项目其他 H5 模块的 code:0 不一致；
 *    走通用 client 会被识别为业务错误。仍然共用 baseUrl / token 工具函数。
 * 2. 实时层：pusher-js 订阅 private-conversation.{id}，监听 message.sent 事件。
 *    连接失败 / 断开 → 指数退避 + since 增量轮询兜底，保证消息不丢。
 * 3. 幂等：每条 customer / ai 消息都带 client_msg_id（UUID），后端唯一索引拦截
 *    重复入库；前端在 status=sending 时显示 clock，sent 后替换为 check。
 * 4. mark-read：进入会话或收到 agent 消息时调用，让发送三态闭环。
 */

import Pusher, { type Channel } from 'pusher-js';
import { getAccessToken, getBaseUrl } from '../api/client';
import type {
  ChatProvider,
  ChatProviderListener,
  ConnectionState,
  ConversationHandle,
  EnsureConversationInput,
  SendMessageInput,
  UnifiedChatMessage,
} from './types';

// ─── 后端响应形状（chat 模块特有：code 是 "200" 字符串）──────────────

interface ChatApiResponse<T> {
  code: string | number;
  msg: string;
  data: T;
}

interface RawMessageListData {
  messages?: RawMessage[];
  has_more?: boolean;
}

interface RawMessage {
  id: number;
  conversation_id: number;
  sender: 'customer' | 'ai' | 'agent';
  sender_name: string | null;
  sender_admin?: { username: string | null; avatar: string | null } | null;
  content: string;
  english_content: string | null;
  client_msg_id: string | null;
  is_read: boolean;
  message_type: 'text' | 'image' | 'file' | 'order' | 'product';
  media_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface RawConversation {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  language: string;
  status: 'open' | 'needs_agent' | 'resolved';
  last_message: string | null;
  last_sender: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Reverb 配置（编译期注入）──────────────────────────────────────────

const REVERB = {
  key: import.meta.env.VITE_REVERB_KEY as string | undefined,
  host: import.meta.env.VITE_REVERB_HOST as string | undefined,
  port: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
  scheme: (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'https',
};

const POLL_INTERVAL_FOREGROUND_MS = 5_000;

function isReverbConfigured(): boolean {
  return !!(REVERB.key && REVERB.host);
}

// ─── 工具函数 ────────────────────────────────────────────────────────

function rawToUnified(m: RawMessage): UnifiedChatMessage {
  return {
    id: String(m.id),
    conversationId: String(m.conversation_id),
    sender: m.sender,
    senderName: m.sender_admin?.username ?? m.sender_name ?? undefined,
    senderAvatar: m.sender_admin?.avatar ?? undefined,
    text: m.content,
    englishText: m.english_content ?? undefined,
    messageType: m.message_type,
    mediaUrl: m.media_url ?? undefined,
    metadata: m.metadata ?? undefined,
    timestamp: new Date(m.created_at.replace(' ', 'T')),
    status: m.is_read ? 'read' : (m.sender === 'customer' ? 'sent' : 'delivered'),
    clientMsgId: m.client_msg_id ?? undefined,
  };
}

function normalizeMessageRows(data: RawMessage[] | RawMessageListData): RawMessage[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.messages)) return data.messages;
  return [];
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('not authenticated');
  }
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  const body = (await res.json()) as ChatApiResponse<T>;
  // chat 模块后端 code 用 "200"，其他成功也兼容 0
  const ok = body.code === '200' || body.code === 200 || body.code === 0;
  if (!ok) {
    throw new Error(`API ${body.code}: ${body.msg}`);
  }
  return body.data;
}

// ─── Provider ────────────────────────────────────────────────────────

export function createLaravelProvider(): ChatProvider {
  let conversationId: string | null = null;
  let pusher: Pusher | null = null;
  let channel: Channel | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastFetchedAt: Date | null = null;
  let connectionState: ConnectionState = 'idle';
  const listeners = new Set<ChatProviderListener>();

  const setConnection = (state: ConnectionState) => {
    if (connectionState === state) return;
    connectionState = state;
    listeners.forEach(l => l.onConnectionChange?.(state));
  };

  const emitMessage = (msg: UnifiedChatMessage) => {
    listeners.forEach(l => l.onMessage?.(msg));
  };

  const startPolling = () => {
    if (pollTimer || !conversationId) return;
    // 无 token 时没有意义轮询（fetchJson 会 401），直接跳过
    if (!getAccessToken()) return;
    pollTimer = setInterval(async () => {
      if (!conversationId || !getAccessToken()) return;
      try {
        const since = lastFetchedAt
          ? lastFetchedAt.toISOString().replace('T', ' ').slice(0, 19)
          : undefined;
        const url = since
          ? `/app/conversations/${conversationId}/messages?since=${encodeURIComponent(since)}`
          : `/app/conversations/${conversationId}/messages`;
        const data = await fetchJson<RawMessage[] | RawMessageListData>(url);
        const rows = normalizeMessageRows(data);
        rows.forEach(r => {
          const unified = rawToUnified(r);
          if (unified.timestamp > (lastFetchedAt ?? new Date(0))) {
            lastFetchedAt = unified.timestamp;
          }
          // 只外推 agent / ai；customer 由发送方本地添加
          if (unified.sender === 'agent' || unified.sender === 'ai') {
            emitMessage(unified);
          }
        });
      } catch {
        // 轮询失败静默吞掉，下次再试；连接状态由 Pusher 主导
      }
    }, POLL_INTERVAL_FOREGROUND_MS);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const teardownPusher = () => {
    if (channel && pusher) {
      try { pusher.unsubscribe(channel.name); } catch { /* noop */ }
    }
    channel = null;
    if (pusher) {
      try { pusher.disconnect(); } catch { /* noop */ }
      pusher = null;
    }
  };

  const connectRealtime = (convId: string) => {
    if (!isReverbConfigured()) {
      // 没有 Reverb 时直接走轮询
      setConnection('offline');
      startPolling();
      return;
    }

    // 幂等保护：React StrictMode 会在 Effect→Cleanup→Effect 序列中
    // 导致 ensureConversation（内部调用此函数）被调用两次。
    // 若 Pusher 实例已存在、连接状态正常且目标频道相同，则跳过重建，
    // 避免 teardownPusher 在第二次调用时强杀刚启动的 WebSocket 连接。
    if (pusher && channel && channel.name === `private-conversation.${convId}`) {
      const state = pusher.connection.state;
      if (state === 'connected' || state === 'connecting') {
        return;
      }
    }

    teardownPusher();
    setConnection('connecting');

    const token = getAccessToken();
    if (!token) {
      setConnection('offline');
      // 无 token 时轮询也会 401，直接 offline 等用户登录后重试
      return;
    }

    const forceTLS = REVERB.scheme === 'https';
    pusher = new Pusher(REVERB.key!, {
      wsHost: REVERB.host!,
      wsPort: REVERB.port,
      wssPort: REVERB.port,
      forceTLS,
      enabledTransports: forceTLS ? ['wss'] : ['ws'],
      cluster: '',
      channelAuthorization: {
        endpoint: `${getBaseUrl().replace(/\/api\/v1$/, '')}/broadcasting/auth`,
        transport: 'ajax',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    });

    // pusher-js 内置自动重连（指数退避 + 有限次重试）。
    // 这里只负责：通知 UI 状态 + 启动轮询兜底；不手动 scheduleReconnect，
    // 否则 teardownPusher + new Pusher 会与内置重连互相冲突。
    pusher.connection.bind('error', () => {
      setConnection('reconnecting');
      startPolling();
    });

    pusher.connection.bind('disconnected', () => {
      setConnection('reconnecting');
      startPolling();
    });

    channel = pusher.subscribe(`private-conversation.${convId}`);

    channel.bind('pusher:subscription_succeeded', () => {
      setConnection('connected');
      stopPolling();
    });

    channel.bind('pusher:subscription_error', () => {
      setConnection('reconnecting');
      startPolling();
    });

    channel.bind('message.sent', (raw: RawMessage) => {
      const unified = rawToUnified(raw);
      if (unified.timestamp > (lastFetchedAt ?? new Date(0))) {
        lastFetchedAt = unified.timestamp;
      }
      // 只外推 agent / ai：customer 由本地 send 直接添加，避免重复
      if (unified.sender === 'agent' || unified.sender === 'ai') {
        emitMessage(unified);
      }
    });
  };

  return {
    name: 'laravel',

    isReady() {
      return !!getAccessToken();
    },

    async ensureConversation(input?: EnsureConversationInput): Promise<ConversationHandle> {
      const body: Record<string, unknown> = {};
      if (input?.customerName) body.customer_name = input.customerName;
      if (input?.customerEmail) body.customer_email = input.customerEmail;
      if (input?.language) body.language = input.language;

      const conv = await fetchJson<RawConversation>('/app/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      conversationId = String(conv.id);
      // 后端 store 会返回已存在的会话或新建的会话；前端无法直接区分
      // 通过 created_at == updated_at 做粗判（新建时几乎相等），仅用于 UI 提示
      const isNew = conv.created_at === conv.updated_at;
      connectRealtime(conversationId);
      return {
        id: conversationId,
        status: conv.status,
        existing: !isNew,
        conversationUpdatedAt: conv.updated_at ?? null,
      };
    },

    async fetchMessages(opts?: { since?: Date }): Promise<UnifiedChatMessage[]> {
      if (!conversationId) return [];
      const sinceParam = opts?.since
        ? `?since=${encodeURIComponent(opts.since.toISOString().replace('T', ' ').slice(0, 19))}`
        : '';
      const data = await fetchJson<RawMessage[] | RawMessageListData>(
        `/app/conversations/${conversationId}/messages${sinceParam}`,
      );
      const rows = normalizeMessageRows(data);
      const list = rows.map(rawToUnified);
      const latest = list[list.length - 1]?.timestamp;
      if (latest && (!lastFetchedAt || latest > lastFetchedAt)) {
        lastFetchedAt = latest;
      }
      return list;
    },

    async send(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      const payload: Record<string, unknown> = {
        content: input.text,
        client_msg_id: input.clientMsgId,
      };
      if (input.englishText) payload.english_content = input.englishText;
      if (input.messageType && input.messageType !== 'text') payload.message_type = input.messageType;
      if (input.mediaUrl) payload.media_url = input.mediaUrl;
      if (input.metadata) payload.metadata = input.metadata;

      const row = await fetchJson<RawMessage>(
        `/app/conversations/${conversationId}/messages`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      return { ...rawToUnified(row), status: 'sent' };
    },

    async sendAi(input: SendMessageInput): Promise<UnifiedChatMessage> {
      if (!conversationId) throw new Error('conversation not ready');
      // `/app/*` currently has no `/messages/ai` endpoint in this backend.
      // Keep AI replies client-side to avoid noisy 404s and unnecessary fallback.
      return {
        id: input.clientMsgId,
        conversationId,
        sender: 'ai',
        senderName: 'Evair AI',
        text: input.text,
        englishText: input.englishText,
        messageType: input.messageType ?? 'text',
        mediaUrl: input.mediaUrl,
        metadata: input.metadata,
        timestamp: new Date(),
        status: 'sent',
        clientMsgId: input.clientMsgId,
      };
    },

    async markNeedsHuman(): Promise<void> {
      // 后端 H5 端目前没有显式 needs_human 接口；
      // 客户发送一条普通消息时后端已自动把 status 置为 needs_agent。
      // 留空实现，避免上层调用方判空。
    },

    async markRead(): Promise<void> {
      if (!conversationId) return;
      try {
        await fetchJson<{ updated: number }>(
          `/app/conversations/${conversationId}/mark-read`,
          { method: 'POST' },
        );
      } catch {
        // 已读失败不影响 UI，下次进入会话再标记
      }
    },

    subscribe(listener: ChatProviderListener): () => void {
      listeners.add(listener);
      listener.onConnectionChange?.(connectionState);
      return () => listeners.delete(listener);
    },

    dispose(): void {
      stopPolling();
      teardownPusher();
      listeners.clear();
      conversationId = null;
      lastFetchedAt = null;
      setConnection('idle');
    },
  };
}
