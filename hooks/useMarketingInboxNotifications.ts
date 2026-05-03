/**
 * Mirrors `CustomerApp`'s bootstrap merge of `MOCK_NOTIFICATIONS` + Supabase
 * `@see App.tsx ~515` — shared list state for header badge count + inbox drawer on marketing shells.
 */

import { useCallback, useEffect, useState } from 'react';
import { MOCK_NOTIFICATIONS } from '@/constants';
import type { AppNotification } from '@/types';
import { fetchNotifications, supabaseConfigured } from '@/services/supabase';

export interface UseMarketingInboxNotificationsResult {
    notifications: AppNotification[];
    onUpdateNotifications: (updater: (prev: AppNotification[]) => AppNotification[]) => void;
}

/** Full merged notification list when logged in; empty when logged out. */
export function useMarketingInboxNotifications(loggedIn: boolean): UseMarketingInboxNotificationsResult {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (!loggedIn) {
            setNotifications([]);
            return;
        }

        let cancelled = false;
        const mergeLikeApp = (serverNotifs: AppNotification[]) =>
            setNotifications((prev) => {
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

        setNotifications(MOCK_NOTIFICATIONS);
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
