/**
 * `useChat` — single-conversation chat state hook.
 *
 * Manages:
 *   - Bootstrapping: auto-creates / fetches the user's open conversation.
 *   - Message list: keeps a sorted, deduped array of messages.
 *   - Sending: optimistic UI (insert pending entry → reconcile when WS
 *     echo arrives, or when REST returns).
 *   - Realtime: subscribes to `private-conversation.{id}` if Reverb is
 *     configured; otherwise polls /messages every 4s. Polling keeps
 *     working even when the user is offline-then-back, so we don't
 *     need a separate "refresh on reconnect" code path.
 *   - Token refresh resilience: the API client's interceptor handles
 *     401 → refresh → retry transparently, so callers don't see a
 *     broken send when their access token expires mid-session.
 *
 * Usage:
 *   const { conversation, messages, status, sendText, sendImage, retry } = useChat();
 *
 *   - `status` is one of:
 *       'idle'         — not yet started (e.g. user logged out)
 *       'loading'      — bootstrap in flight
 *       'ready'        — conversation loaded, listening for messages
 *       'reconnecting' — WS dropped; polling is keeping it alive
 *       'error'        — bootstrap failed (server down, no auth, etc.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chatService,
  ConversationDto,
  ChatMessageDto,
  newClientMsgId,
  MessageType,
} from '../services/api/chat';
import {
  disconnectEcho,
  getEcho,
  isRealtimeConfigured,
} from '../services/realtime/echo';

export type ChatStatus = 'idle' | 'loading' | 'ready' | 'reconnecting' | 'error';

/**
 * Local message record — extends the server DTO with optimistic-state
 * markers we need to render the UI ("Sending...", "Failed, tap to retry").
 */
export interface LocalChatMessage extends ChatMessageDto {
  /**
   * For optimistic entries that haven't been confirmed yet. Once the
   * server-side message arrives (over WS or REST) we replace the
   * optimistic entry by matching on `client_msg_id`.
   */
  isOptimistic?: boolean;
  /** Set true when sendMessage rejects — UI surfaces a "Retry" affordance. */
  failed?: boolean;
}

/**
 * Polling interval (ms) when Reverb isn't configured or the WS dropped.
 * 4s is a sweet spot: snappy enough that conversations feel real-time
 * for the customer-facing side, slow enough that we don't hammer the
 * Laravel server with requests when nobody is talking.
 */
const POLL_INTERVAL_MS = 4_000;

// Sort messages chronologically, with optimistic entries (no real id)
// pinned to the bottom in send order.
function sortMessages(list: LocalChatMessage[]): LocalChatMessage[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

/**
 * Merge a batch of incoming messages into an existing list, removing
 * any optimistic entries that the new batch confirms (matched on
 * `client_msg_id`). Keeps optimistic entries that aren't yet confirmed.
 */
function mergeMessages(
  existing: LocalChatMessage[],
  incoming: ChatMessageDto[]
): LocalChatMessage[] {
  if (incoming.length === 0) return existing;

  // Index existing by id for O(1) duplicate detection. Also collect the
  // `client_msg_id` of every incoming message so we can prune matching
  // optimistic entries in one pass.
  const byId = new Map<number, LocalChatMessage>();
  for (const m of existing) {
    if (m.id > 0) byId.set(m.id, m);
  }
  const incomingClientIds = new Set<string>();
  for (const m of incoming) {
    if (m.client_msg_id) incomingClientIds.add(m.client_msg_id);
  }

  // Drop optimistic entries whose `client_msg_id` is now confirmed.
  const survivingExisting = existing.filter(m => {
    if (!m.isOptimistic) return true;
    return !(m.client_msg_id && incomingClientIds.has(m.client_msg_id));
  });

  // Add or replace incoming messages.
  const next: LocalChatMessage[] = [...survivingExisting];
  for (const m of incoming) {
    const at = next.findIndex(x => x.id === m.id);
    if (at >= 0) {
      next[at] = { ...next[at], ...m, isOptimistic: false, failed: false };
    } else {
      next.push({ ...m });
    }
  }
  return sortMessages(next);
}

export function useChat() {
  const [conversation, setConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Cleanup tracker: WS subscription, poll interval, and a "mounted" flag
  // for safely setting state from async callbacks.
  const subscriptionRef = useRef<{ leave: () => void } | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Track the latest messages array in a ref so the polling timer's
  // closure doesn't go stale every render. Without this, we'd either
  // (a) restart the timer on every state change, or
  // (b) use the snapshot from when the effect first ran (always empty).
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      lastMessageAtRef.current = messages[messages.length - 1].created_at;
    }
  }, [messages]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Fold an incoming WS or REST batch into state, marking status.
   */
  const ingestMessages = useCallback((incoming: ChatMessageDto[]) => {
    if (!mountedRef.current) return;
    setMessages(prev => mergeMessages(prev, incoming));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (conversationId: number) => {
      stopPolling();
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const since = lastMessageAtRef.current ?? undefined;
          const list = await chatService.listMessages(conversationId, { since });
          if (list.length > 0) ingestMessages(list);
        } catch (err) {
          // Don't tear down on transient errors — the next tick will retry.
          // We only log so it shows up in the console for debugging.
          console.warn('[useChat] poll failed', err);
        }
      }, POLL_INTERVAL_MS);
    },
    [ingestMessages, stopPolling]
  );

  /**
   * Subscribe to the conversation channel. Returns a cleanup function
   * that the caller MUST run before the next subscribe / on unmount.
   */
  const subscribeRealtime = useCallback(
    async (conversationId: number) => {
      if (!isRealtimeConfigured()) {
        // No WS configured — start polling and return a no-op cleanup.
        startPolling(conversationId);
        return () => {
          /* polling cleanup happens in stopPolling */
        };
      }

      try {
        const echo = await getEcho();
        if (!echo) {
          startPolling(conversationId);
          return () => {
            /* noop */
          };
        }

        const channel = echo
          .private(`conversation.${conversationId}`)
          .listen('.message.sent', (event: ChatMessageDto) => {
            ingestMessages([event]);
          });

        // Surface WS lifecycle so the UI can show "reconnecting" badges.
        // pusher-js exposes connection state via `connector.pusher.connection`.
        try {
          const conn = (echo.connector as any)?.pusher?.connection;
          if (conn?.bind) {
            conn.bind('connected', () => mountedRef.current && setStatus('ready'));
            conn.bind('connecting', () =>
              mountedRef.current && setStatus(prev => (prev === 'ready' ? 'reconnecting' : prev))
            );
            conn.bind('unavailable', () => mountedRef.current && setStatus('reconnecting'));
            conn.bind('failed', () => mountedRef.current && setStatus('reconnecting'));
          }
        } catch {
          /* not fatal — we just don't get connection-state badges */
        }

        // Belt-and-suspenders: keep a slow poll going alongside the WS
        // so that any messages the WS misses (e.g. during reconnect or
        // if the agent sends two messages in <500ms and we drop one)
        // still show up. The merge logic dedups, so this is harmless.
        startPolling(conversationId);

        return () => {
          stopPolling();
          try {
            channel.stopListening('.message.sent');
            echo.leave(`conversation.${conversationId}`);
          } catch {
            /* harmless */
          }
        };
      } catch (err) {
        console.warn('[useChat] realtime subscribe failed, polling instead', err);
        startPolling(conversationId);
        return () => {
          /* noop */
        };
      }
    },
    [ingestMessages, startPolling, stopPolling]
  );

  /**
   * Bootstrap: get-or-create the conversation, fetch existing messages,
   * subscribe. Idempotent — calling repeatedly will tear down + redo.
   */
  const bootstrap = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const conv = await chatService.getOrCreateConversation();
      if (!mountedRef.current) return;
      setConversation(conv);

      const initial = await chatService.listMessages(conv.id);
      if (!mountedRef.current) return;
      setMessages(sortMessages(initial.map(m => ({ ...m }))));
      lastMessageAtRef.current =
        initial.length > 0 ? initial[initial.length - 1].created_at : null;

      const cleanup = await subscribeRealtime(conv.id);
      // Stash cleanup so the unmount/effect can call it.
      subscriptionRef.current = { leave: cleanup };

      if (mountedRef.current) setStatus('ready');
    } catch (err) {
      console.warn('[useChat] bootstrap failed', err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, [subscribeRealtime]);

  // Run bootstrap on mount; tear everything down on unmount. Note we do
  // NOT disconnect the global Echo instance here — it's a singleton
  // shared across mounts, so a remount can reuse the open WS connection.
  useEffect(() => {
    bootstrap();
    return () => {
      stopPolling();
      const sub = subscriptionRef.current;
      subscriptionRef.current = null;
      if (sub?.leave) {
        try {
          sub.leave();
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      options: { messageType?: MessageType; mediaUrl?: string; metadata?: Record<string, unknown> } = {}
    ) => {
      if (!conversation) {
        throw new Error('Cannot send before conversation is ready');
      }

      const clientMsgId = newClientMsgId();

      // Optimistic insert: render immediately so the UI feels instant.
      // We use a negative id so it can never collide with a server id.
      const optimistic: LocalChatMessage = {
        id: -Date.now(),
        conversation_id: conversation.id,
        sender: 'customer',
        sender_name: null,
        content,
        english_content: null,
        client_msg_id: clientMsgId,
        is_read: false,
        message_type: options.messageType ?? 'text',
        media_url: options.mediaUrl ?? null,
        metadata: options.metadata ?? null,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      setMessages(prev => sortMessages([...prev, optimistic]));

      try {
        const confirmed = await chatService.sendMessage(conversation.id, {
          content,
          client_msg_id: clientMsgId,
          message_type: options.messageType ?? 'text',
          media_url: options.mediaUrl,
          metadata: options.metadata,
        });
        // Reconcile: replace optimistic entry with the confirmed one.
        if (mountedRef.current) ingestMessages([confirmed]);
      } catch (err) {
        console.warn('[useChat] send failed', err);
        if (!mountedRef.current) return;
        // Mark the optimistic entry as failed so the UI can show a
        // "Retry" affordance. Don't drop it — the user typed it, they
        // should see what they sent.
        setMessages(prev =>
          prev.map(m =>
            m.client_msg_id === clientMsgId ? { ...m, failed: true } : m
          )
        );
        throw err;
      }
    },
    [conversation, ingestMessages]
  );

  const sendText = useCallback((text: string) => sendMessage(text, { messageType: 'text' }), [sendMessage]);

  const sendImage = useCallback(
    async (file: File) => {
      const upload = await chatService.uploadAttachment(file);
      return sendMessage('[image]', {
        messageType: 'image',
        mediaUrl: upload.url,
        metadata: { width: upload.width, height: upload.height, bytes: upload.bytes },
      });
    },
    [sendMessage]
  );

  /**
   * Re-attempt sending a message that previously failed (the optimistic
   * entry stays in the list; we just call sendMessage again with the
   * same content). Drops the failed optimistic before retrying so we
   * don't end up with two copies.
   */
  const retry = useCallback(
    async (clientMsgId: string) => {
      const failedMessage = messagesRef.current.find(m => m.client_msg_id === clientMsgId);
      if (!failedMessage) return;
      setMessages(prev => prev.filter(m => m.client_msg_id !== clientMsgId));
      await sendMessage(failedMessage.content, {
        messageType: failedMessage.message_type,
        mediaUrl: failedMessage.media_url ?? undefined,
        metadata: failedMessage.metadata ?? undefined,
      });
    },
    [sendMessage]
  );

  return useMemo(
    () => ({
      conversation,
      messages,
      status,
      error,
      sendText,
      sendImage,
      sendMessage,
      retry,
      reload: bootstrap,
      disconnect: disconnectEcho,
    }),
    [conversation, messages, status, error, sendText, sendImage, sendMessage, retry, bootstrap]
  );
}

export default useChat;
