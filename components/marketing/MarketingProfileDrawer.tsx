import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProfileView from '@/views/ProfileView';
import type { AppNotification } from '@/types';

export interface MarketingProfileDrawerProps {
    open: boolean;
    onClose: () => void;
    isLoggedIn: boolean;
    user?: { name: string; role?: string; email: string };
    notifications: AppNotification[];
    onLogout: () => void | Promise<void>;
    onOpenInbox: () => void;
    onOpenDialer: () => void;
    userLoading?: boolean;
    onUserUpdate?: (user: { name: string; role?: string; email: string }) => void;
}

/**
 * Marketing-site account — floating card from `md:` up; below `md`, full-viewport sheet.
 */
const MarketingProfileDrawer: React.FC<MarketingProfileDrawerProps> = ({
    open,
    onClose,
    isLoggedIn,
    user,
    notifications,
    onLogout,
    onOpenInbox,
    onOpenDialer,
    onUserUpdate,
    userLoading = false,
}) => {
    const { t } = useTranslation();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const mount = typeof document !== 'undefined' && document.body ? document.body : null;
    if (!mount) return null;

    return createPortal(
        <div className="fixed inset-0 z-[70]" role="presentation">
            <button
                type="button"
                className="absolute inset-0 hidden bg-slate-900/35 backdrop-blur-[2px] animate-in fade-in duration-200 md:block"
                aria-label={t('barcode_scanner.close')}
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('profile.title')}
                className="fixed inset-0 z-[71] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none bg-[#eef1f6] shadow-none ring-0 animate-in fade-in duration-200 md:inset-auto md:bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+8px))] md:left-auto md:right-5 md:top-auto md:h-[min(42rem,calc(100dvh-7rem))] md:max-h-[min(42rem,calc(100dvh-7rem))] md:w-full md:max-w-[400px] md:rounded-2xl md:shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] md:ring-1 md:ring-black/10 md:zoom-in-95 lg:right-8"
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none md:rounded-2xl">
                    {isLoggedIn && userLoading ? (
                        <div className="flex flex-1 min-h-[12rem] flex-col items-center justify-center gap-3 bg-[#F2F4F7] text-slate-500">
                            <Loader2 className="h-9 w-9 animate-spin text-brand-orange" aria-hidden />
                        </div>
                    ) : (
                        <ProfileView
                            embedded
                            isLoggedIn={isLoggedIn}
                            user={user}
                            onLogin={() => {
                                void window.location.assign('/app');
                            }}
                            onSignup={() => {
                                void window.location.assign('/app');
                            }}
                            onLogout={onLogout}
                            onOpenDialer={onOpenDialer}
                            onOpenInbox={onOpenInbox}
                            notifications={notifications}
                            onBack={onClose}
                            onUserUpdate={onUserUpdate}
                        />
                    )}
                </div>
            </div>
        </div>,
        mount,
    );
};

export default MarketingProfileDrawer;
