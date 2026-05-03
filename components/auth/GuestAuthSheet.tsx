/**
 * Same shell as top-up checkout auth: bottom-sheet on handheld, centred card on `md+`.
 * Portaled to `document.body` so it is not clipped by `/app` phone-frame layouts.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import InlineGuestAuthForm from '@/components/auth/InlineGuestAuthForm';
import type { UserDto } from '@/services/api/types';

export interface GuestAuthSheetProps {
    open: boolean;
    initialMode?: 'register' | 'login';
    onClose: () => void;
    onSuccess: (user: UserDto) => void;
}

const GuestAuthSheet: React.FC<GuestAuthSheetProps> = ({
    open,
    initialMode = 'login',
    onClose,
    onSuccess,
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
        <div
            role="presentation"
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('profile.sheet_auth_title')}
                className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-w-md md:rounded-2xl"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <InlineGuestAuthForm
                    variant="profile"
                    initialMode={initialMode}
                    dismissible
                    onCancel={onClose}
                    onAuthenticated={(user) => {
                        onSuccess(user);
                        onClose();
                    }}
                />
            </div>
        </div>,
        mount,
    );
};

export default GuestAuthSheet;
