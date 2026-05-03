import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, UserCircle } from 'lucide-react';
import MarketingInboxDrawer from '@/components/marketing/MarketingInboxDrawer';
import MarketingProfileDrawer from '@/components/marketing/MarketingProfileDrawer';
import { useAuthSessionPresent } from '@/hooks/useAuthSessionPresent';
import { useMarketingInboxNotifications } from '@/hooks/useMarketingInboxNotifications';
import { authService, userService } from '@/services/api';
import { EVAIR_OPEN_MARKETING_CONTACT_EVENT } from '@/utils/evairMarketingEvents';

/** Inbox + profile floating drawers — same panel pattern as live chat / contact; no `/app` navigation. */
const SiteHeaderAccountActions: React.FC = () => {
    const { t } = useTranslation();
    const loggedIn = useAuthSessionPresent();
    const { notifications, onUpdateNotifications } = useMarketingInboxNotifications(loggedIn);
    const unread = notifications.filter((n) => !n.read).length;
    const [inboxOpen, setInboxOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [initial, setInitial] = useState<string | null>(null);
    const [profileUser, setProfileUser] = useState<{ name: string; email: string } | undefined>(undefined);
    const [profileUserLoading, setProfileUserLoading] = useState(false);

    useEffect(() => {
        if (!loggedIn) {
            setInitial(null);
            setProfileUser(undefined);
            setProfileUserLoading(false);
            setProfileOpen(false);
            return;
        }
        let c = false;
        setProfileUserLoading(true);
        userService
            .getProfile()
            .then((u) => {
                if (c) return;
                setProfileUser({ name: u.name ?? '', email: u.email ?? '' });
                const ch = u.name?.trim().charAt(0);
                if (ch) setInitial(ch.toUpperCase());
            })
            .catch(() => {
                if (!c) setProfileUser({ name: '', email: '' });
            })
            .finally(() => {
                if (!c) setProfileUserLoading(false);
            });
        return () => {
            c = true;
        };
    }, [loggedIn]);

    /** Always render inbox + profile in the marketing header (including narrow mobile WebView).
     * Logged-out users still open the drawers: inbox shows empty-state copy; profile shows sign-in CTAs → `/app`.
     */

    const openInbox = () => {
        setProfileOpen(false);
        setInboxOpen(true);
    };

    const openProfile = () => {
        setInboxOpen(false);
        setProfileOpen(true);
    };

    const bellCls =
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-200 active:scale-[0.98]';
    const profileCls =
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm outline-none transition-colors active:scale-[0.98]';

    return (
        <>
            {/* Option A: explicit gap between inbox + profile; spacing before OPEN APP in SiteHeader */}
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={openInbox}
                    className={bellCls}
                    aria-label={t('marketing.header_inbox_aria')}
                    aria-expanded={inboxOpen}
                    aria-haspopup="dialog"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <Bell size={18} aria-hidden />
                    {unread > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={openProfile}
                    className={profileCls}
                    aria-label={t('marketing.header_profile_aria')}
                    aria-expanded={profileOpen}
                    aria-haspopup="dialog"
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
                </button>
            </div>
            <MarketingInboxDrawer
                open={inboxOpen}
                onClose={() => setInboxOpen(false)}
                notifications={notifications}
                onUpdateNotifications={onUpdateNotifications}
            />
            <MarketingProfileDrawer
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                isLoggedIn={loggedIn}
                user={profileUser}
                userLoading={profileOpen && profileUserLoading}
                notifications={notifications}
                onLogout={async () => {
                    setProfileOpen(false);
                    await authService.logout();
                }}
                onOpenInbox={openInbox}
                onOpenDialer={() => {
                    setProfileOpen(false);
                    window.dispatchEvent(new CustomEvent(EVAIR_OPEN_MARKETING_CONTACT_EVENT));
                }}
                onUserUpdate={(updated) =>
                    setProfileUser((prev) =>
                        prev ? { ...prev, ...updated } : { name: updated.name, email: updated.email },
                    )
                }
            />
        </>
    );
};

export default SiteHeaderAccountActions;
