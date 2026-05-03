import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUnreadChat } from '../hooks/useUnreadChat';

export interface AppShellLiveChatButtonProps {
  onClick: () => void;
  /** Omit gradient (e.g. marketing header on white) — still orange text/icon treatment via className overrides if needed */
  className?: string;
}

/**
 * Header-only live chat CTA (replaces the retired floating {@link SupportFab}).
 * Matches Shop row styling and agent-unread badge semantics.
 */
export default function AppShellLiveChatButton({
  onClick,
  className = 'relative ml-auto flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#FF6600] to-[#FF8A3D] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm active:scale-[0.98] transition-transform',
}: AppShellLiveChatButtonProps) {
  const { t } = useTranslation();
  const { unread } = useUnreadChat(true);

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={t('support_fab.open_chat')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <MessageCircle size={16} strokeWidth={2} className="shrink-0 text-white" aria-hidden />
      <span className="max-w-[4.75rem] truncate sm:max-w-none">{t('support_fab.live_chat')}</span>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-[3px] text-[10px] font-bold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
