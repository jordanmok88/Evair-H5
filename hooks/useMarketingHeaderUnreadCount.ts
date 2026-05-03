/**
 * Mirrors `CustomerApp`'s bootstrap merge of `MOCK_NOTIFICATIONS` + Supabase
 * `@see App.tsx ~515` — unread count for ShopView/header parity on marketing shells.
 */

import { useEffect, useState } from 'react';
import { MOCK_NOTIFICATIONS } from '@/constants';
import type { AppNotification } from '@/types';
import { fetchNotifications, supabaseConfigured } from '@/services/supabase';

/** Returns unread `(read === false)` count for the merged list — `0` when not logged in. */
export function useMarketingHeaderUnreadCount(loggedIn: boolean): number {
  const [list, setList] = useState<AppNotification[]>(() => []);

  useEffect(() => {
    if (!loggedIn) {
      setList([]);
      return;
    }

    let cancelled = false;
    /** Same merge as CustomerApp → server rows replace curated `N-*` mocks when fetch succeeds. */
    const mergeLikeApp = (serverNotifs: AppNotification[]) =>
      setList((prev) => {
        const localOnly = prev.filter((n) => n.id.startsWith('auto-') || n.id.startsWith('N-'));
        const autoOnly = localOnly.filter((n) => n.id.startsWith('auto-'));
        return serverNotifs.length > 0 ? [...serverNotifs, ...autoOnly] : prev;
      });

    function pull() {
      if (!loggedIn || !supabaseConfigured) return;
      const lang =
        typeof localStorage !== 'undefined' ? localStorage.getItem('evair-lang') || 'en' : 'en';
      fetchNotifications(lang)
        .then((serverNotifs) => {
          if (!cancelled && serverNotifs.length > 0) mergeLikeApp(serverNotifs);
        })
        .catch(() => {});
    }

    const boot = MOCK_NOTIFICATIONS;
    setList(boot);
    pull();

    const resume = () => {
      if (document.visibilityState === 'visible') pull();
    };

    window.addEventListener('focus', pull);
    document.addEventListener('visibilitychange', resume);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', pull);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [loggedIn]);

  if (!loggedIn) return 0;
  return list.filter((n) => !n.read).length;
}
