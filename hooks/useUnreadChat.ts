/**
 * 共享聊天未读计数 hook
 *
 * 用于浮动客服按钮（FAB）的未读小红点显示。
 *
 * 实现要点：
 * - 复用 acquireSharedChatProvider 的引用计数机制，确保 ContactUsView
 *   打开时不会触发"重连 + 重订阅"
 * - 收到 agent 消息时未读 +1；进入 Tab.DIALER 后 SupportFab 的 visible
 *   切到 false，hook cleanup 触发 release，下次切回主页重新计数（自然
 *   归零）。对 markRead 的同步通过 SupportFab visible prop 实现。
 */

import { useEffect, useRef, useState } from 'react';
import { acquireSharedChatProvider, releaseSharedChatProvider } from '../services/chat';

export function useUnreadChat(active: boolean): { unread: number; reset: () => void } {
  const [unread, setUnread] = useState(0);
  const initRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (initRef.current) return;
    initRef.current = true;

    const provider = acquireSharedChatProvider();

    let cancelled = false;
    const unsubscribe = provider.subscribe({
      onMessage: msg => {
        if (cancelled) return;
        if (msg.sender === 'agent' && msg.status !== 'read') {
          setUnread(c => c + 1);
        }
      },
    });

    (async () => {
      try {
        const handle = await provider.ensureConversation();
        if (cancelled || !handle.existing) return;
        const history = await provider.fetchMessages();
        const count = history.filter(m => m.sender === 'agent' && m.status !== 'read').length;
        setUnread(count);
      } catch {
        // 离线 / 未登录：未读保持 0
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      releaseSharedChatProvider();
      initRef.current = false;
    };
  }, [active]);

  const reset = () => setUnread(0);
  return { unread, reset };
}
