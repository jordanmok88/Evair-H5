import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import InboxView from '../../views/InboxView';
import type { AppNotification } from '../../types';

export interface MarketingInboxDrawerProps {
    open: boolean;
    onClose: () => void;
    notifications: AppNotification[];
    onUpdateNotifications: (updater: (prev: AppNotification[]) => AppNotification[]) => void;
}

/**
 * Marketing-site inbox — floating card from `md:` up (matches legacy layout);
 * below `md`, full-viewport sheet so phones are not stuck with a short floating card.
 *
 * Portals to `document.body` so `position:fixed` is viewport-anchored — ancestors with
 * `backdrop-filter` (e.g. sticky `SiteHeader`) otherwise create a containing block in Safari/WebKit.
 */
const MarketingInboxDrawer: React.FC<MarketingInboxDrawerProps> = ({
    open,
    onClose,
    notifications,
    onUpdateNotifications,
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

    const goAppShop = () => {
        onClose();
        window.location.assign('/app#shop');
    };

    const mount =
        typeof document !== 'undefined' && document.body ? document.body : null;
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
                aria-label={t('profile.inbox')}
                className="fixed inset-0 z-[71] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none bg-[#eef1f6] shadow-none ring-0 animate-in fade-in duration-200 md:inset-auto md:bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+8px))] md:left-auto md:right-5 md:top-auto md:h-[min(42rem,calc(100dvh-7rem))] md:max-h-[min(42rem,calc(100dvh-7rem))] md:w-full md:max-w-[400px] md:rounded-2xl md:shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] md:ring-1 md:ring-black/10 md:zoom-in-95 lg:right-8"
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none md:rounded-2xl">
                    <InboxView
                        notifications={notifications}
                        onUpdateNotifications={onUpdateNotifications}
                        onNavigate={() => goAppShop()}
                        onBack={onClose}
                        embedded
                    />
                </div>
            </div>
        </div>,
        mount,
    );
};

export default MarketingInboxDrawer;
