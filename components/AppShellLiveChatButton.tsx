import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUnreadChat } from '../hooks/useUnreadChat';

export interface AppShellLiveChatButtonProps {
  onClick: () => void;
  /** Omit gradient (e.g. marketing header on white) — still orange text/icon treatment via className overrides if needed */
  className?: string;
  /** Message icon only (no “Live chat” label) — paired with aria-label + min tap target */
  iconOnly?: boolean;
}

/**
 * Header-only live chat CTA (replaces the retired floating {@link SupportFab}).
 * Matches Shop row styling and agent-unread badge semantics.
 */
const DEFAULT_CLASS =
  'relative ml-auto flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#FF6600] to-[#FF8A3D] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm active:scale-[0.98] transition-transform';

const ICON_ONLY_CLASS =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#FF6600] to-[#FF8A3D] shadow-sm outline-none transition-transform active:scale-[0.98]';

export default function AppShellLiveChatButton({
  onClick,
  className,
  iconOnly = false,
}: AppShellLiveChatButtonProps) {
  const { t } = useTranslation();
  const { unread } = useUnreadChat(true);
  const merged =
    className ??
    (iconOnly ? ICON_ONLY_CLASS : DEFAULT_CLASS);

  return (
    <button
      type="button"
      onClick={onClick}
      className={merged}
      aria-label={t('support_fab.open_chat')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <MessageCircle size={iconOnly ? 20 : 16} strokeWidth={2} className="shrink-0 text-white" aria-hidden />
      {!iconOnly && (
        <span className="max-w-[4.75rem] truncate sm:max-w-none">{t('support_fab.live_chat')}</span>
      )}
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-[3px] text-[10px] font-bold leading-none text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
