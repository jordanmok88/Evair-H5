import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, UserCircle } from 'lucide-react';
import { useAuthSessionPresent } from '@/hooks/useAuthSessionPresent';
import { useMarketingHeaderUnreadCount } from '@/hooks/useMarketingHeaderUnreadCount';
import { userService } from '@/services/api';

/** Bell (/app#inbox) + gradient profile (/app#profile) — visual parity `@see ShopView.tsx` ~1407–1421 */
const SiteHeaderAccountActions: React.FC = () => {
    const { t } = useTranslation();
    const loggedIn = useAuthSessionPresent();
    const unread = useMarketingHeaderUnreadCount(loggedIn);
    const [initial, setInitial] = useState<string | null>(null);

    useEffect(() => {
        if (!loggedIn) {
            setInitial(null);
            return;
        }
        let c = false;
        userService
            .getProfile()
            .then((u) => {
                const ch = u.name?.trim().charAt(0);
                if (!c && ch) setInitial(ch.toUpperCase());
            })
            .catch(() => {});
        return () => {
            c = true;
        };
    }, [loggedIn]);

    if (!loggedIn) return null;

    const bellCls =
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-200 active:scale-[0.98]';
    const profileCls =
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm outline-none transition-colors active:scale-[0.98]';

    return (
        <>
            <a
                href="/app#inbox"
                className={bellCls}
                aria-label={t('marketing.header_inbox_aria')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <Bell size={18} aria-hidden />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </a>
            <a
                href="/app#profile"
                className={profileCls}
                aria-label={t('marketing.header_profile_aria')}
                style={{
                    background: 'linear-gradient(135deg, #FF6600, #FF8A3D)',
                    WebkitTapHighlightColor: 'transparent',
                }}
            >
                {initial ? (
                    <span className="text-sm font-bold text-white">{initial}</span>
                ) : (
                    <UserCircle size={20} className="text-white" aria-hidden />
                )}
            </a>
        </>
    );
};

export default SiteHeaderAccountActions;
