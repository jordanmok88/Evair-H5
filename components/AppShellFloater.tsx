import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export interface AppShellFloaterProps {
    open: boolean;
    onClose: () => void;
    /** `aria-label` on the dialog surface */
    ariaLabel: string;
    children: React.ReactNode;
}

/**
 * `/app` shell — bottom-corner floating panel (same geometry as marketing inbox/chat),
 * portaled to `document.body` so it is not clipped by phone-frame or backdrop-filter ancestors.
 * z-index below {@link GuestAuthSheet} (80) so sheet auth stacks above the profile panel.
 */
const AppShellFloater: React.FC<AppShellFloaterProps> = ({ open, onClose, ariaLabel, children }) => {
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
        <div className="fixed inset-0 z-[74]" role="presentation">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] animate-in fade-in duration-200"
                aria-label={t('barcode_scanner.close')}
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+8px))] left-4 right-4 z-[75] mx-auto flex h-[min(42rem,calc(100dvh-7rem))] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-[#eef1f6] shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-200 sm:left-auto sm:right-5 sm:mx-0 md:right-8"
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">{children}</div>
            </div>
        </div>,
        mount,
    );
};

export default AppShellFloater;
