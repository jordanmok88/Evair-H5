/**
 * Marketing-site inbox — Laravel admin notifications only (public GET /app/notifications).
 * Shown when the visitor is logged in (same gate as before).
 */

import { useCallback, useEffect, useState } from 'react';
import type { AppNotification } from '@/types';
import { fetchLaravelAdminNotifications } from '@/services/fetchLaravelAdminNotifications';

export interface UseMarketingInboxNotificationsResult {
  notifications: AppNotification[];
  onUpdateNotifications: (updater: (prev: AppNotification[]) => AppNotification[]) => void;
}

/** Inbox list when logged in — sourced from Laravel admin `notifications` table only. */
export function useMarketingInboxNotifications(loggedIn: boolean): UseMarketingInboxNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!loggedIn) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    function pull() {
      const lang =
        typeof localStorage !== 'undefined' ? localStorage.getItem('evair-lang') || 'en' : 'en';
      const countryCode =
        typeof localStorage !== 'undefined' ? localStorage.getItem('evair-inbox-country') : null;
      fetchLaravelAdminNotifications(lang, { countryCode })
        .then((rows) => {
          if (!cancelled) setNotifications(rows);
        })
        .catch(() => {
          if (!cancelled) setNotifications([]);
        });
    }

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

  const onUpdateNotifications = useCallback(
    (updater: (prev: AppNotification[]) => AppNotification[]) => {
      setNotifications(updater);
    },
    [],
  );

  return { notifications, onUpdateNotifications };
}
