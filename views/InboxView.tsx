import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Bell, Package, AlertTriangle, Clock, Tag, Zap, Trash2, ArrowLeft } from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import FlagIcon from '../components/FlagIcon';
import MobileOpenAppNudge from '../components/shell/MobileOpenAppNudge';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

type InboxFilter = 'all' | 'alerts' | 'orders' | 'promos';

const NOTIF_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  data_low: { icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  expiring: { icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
  order: { icon: Package, color: '#10B981', bg: '#ECFDF5' },
  promo: { icon: Tag, color: '#8B5CF6', bg: '#F5F3FF' },
  service: { icon: Zap, color: '#3B82F6', bg: '#EFF6FF' },
};

const FILTER_MAP: Record<InboxFilter, NotificationType[]> = {
  all: ['data_low', 'expiring', 'order', 'promo', 'service'],
  alerts: ['data_low', 'expiring'],
  orders: ['order'],
  promos: ['promo', 'service'],
};

interface InboxViewProps {
  notifications: AppNotification[];
  onUpdateNotifications: (updater: (prev: AppNotification[]) => AppNotification[]) => void;
  onNavigate?: (tab: string) => void;
  onBack?: () => void;
  /** Marketing floating drawer — compact chrome + in-flow scroll (see `MarketingInboxDrawer`). */
  embedded?: boolean;
}

const resolveText = (key: string, t: (k: string, opts?: Record<string, string>) => string, opts?: Record<string, string>): string => {
  if (key.startsWith('__raw:')) return key.slice(6);
  return t(key, opts);
};

const InboxView: React.FC<InboxViewProps> = ({
  notifications,
  onUpdateNotifications,
  onNavigate,
  onBack,
  embedded = false,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSwipeBack = useCallback(() => { onBack?.(); }, [onBack]);
  useSwipeBack(onBack ? 1 : 0, handleSwipeBack);
  useEdgeSwipeBack(handleSwipeBack);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = notifications.filter(n => FILTER_MAP[filter].includes(n.type));

  const markAllRead = () => onUpdateNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleDelete = (id: string) => {
    onUpdateNotifications(prev => prev.filter(n => n.id !== id));
    setDeleteConfirmId(null);
  };

  const handleNotifClick = (notif: AppNotification) => {
    onUpdateNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (onNavigate && notif.actionLabel) {
      onNavigate('ESIM');
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('inbox.just_now');
    if (hours < 24) return t('inbox.hours_ago', { count: hours });
    return t('inbox.days_ago', { count: Math.floor(hours / 24) });
  };

  const filters: { key: InboxFilter; label: string }[] = [
    { key: 'all', label: t('inbox.filter_all') },
    { key: 'alerts', label: t('inbox.filter_alerts') },
    { key: 'orders', label: t('inbox.filter_orders') },
    { key: 'promos', label: t('inbox.filter_promos') },
  ];

  const deleteTarget = deleteConfirmId ? notifications.find(n => n.id === deleteConfirmId) : null;

  return (
    <div
      className={`flex flex-col bg-[#F2F4F7] relative ${embedded ? 'h-full min-h-0' : 'lg:h-full'}`}
    >
      {/* Header */}
      <div
        className={`bg-white/90 backdrop-blur-xl shrink-0 sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 px-4 pb-3 ${
          embedded ? 'pt-3' : 'pt-safe'
        }`}
      >
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 shrink-0 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors">
            <ArrowLeft size={22} className="text-slate-900" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-slate-900">{t('profile.inbox')}</h1>
        <MobileOpenAppNudge />
      </div>

      <div
        className={`no-scrollbar pb-6 pt-4 ${
          embedded
            ? 'flex-1 min-h-0 overflow-y-auto px-4'
            : 'lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 md:px-8 lg:px-4'
        }`}
      >
        {/* Unread count & mark all read */}
        {unreadCount > 0 && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">
              {t('inbox.unread_count', { count: unreadCount })}
            </span>
            <button onClick={markAllRead} className="text-xs font-semibold text-brand-orange active:opacity-70">
              {t('inbox.mark_all_read')}
            </button>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-white border border-slate-100 text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {filtered.length > 0 ? (
          <div className="space-y-2.5">
            {filtered.map(notif => {
              const cfg = NOTIF_CONFIG[notif.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={notif.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    notif.read
                      ? 'bg-white border-slate-100'
                      : 'bg-white border-l-[3px] shadow-sm'
                  }`}
                  style={!notif.read ? { borderLeftColor: cfg.color } : undefined}
                >
                  <button className="w-full text-left px-4 pt-3 pb-2" onClick={() => handleNotifClick(notif)}>
                    <div className="flex gap-3.5 items-start">
                      {/* Icon / Flag */}
                      <div className="shrink-0">
                        {notif.countryCode ? (
                          <div className="relative">
                            <FlagIcon countryCode={notif.countryCode} size="md" />
                            <div
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                              style={{ backgroundColor: cfg.bg }}
                            >
                              <Icon size={10} style={{ color: cfg.color }} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                            <Icon size={20} style={{ color: cfg.color }} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-[15px] leading-snug ${notif.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                            {resolveText(notif.titleKey, t)}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
                            <span className="text-[12px] text-slate-400 font-medium">{formatTimeAgo(notif.date)}</span>
                          </div>
                        </div>
                        <p className="text-[13px] text-slate-500 leading-relaxed">
                          {resolveText(notif.bodyKey, t, { plan: notif.planName ?? '', orderNo: notif.orderNo ?? '' })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Bottom bar: action + delete */}
                  <div className="flex items-center justify-between px-4 pb-3 pt-1">
                    {notif.actionLabel ? (
                      <button
                        onClick={() => handleNotifClick(notif)}
                        className="inline-flex items-center gap-1 text-[13px] font-bold rounded-full px-3.5 py-1.5"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {resolveText(notif.actionLabel!, t)}
                        <ChevronRight size={13} />
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(notif.id); }}
                      className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Bell size={24} className="text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">{t('profile.inbox_empty_title')}</h2>
            <p className="text-slate-500 leading-relaxed text-sm">{t('profile.inbox_empty_desc')}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && deleteTarget && (
        <div
          className="absolute inset-0 z-[200] bg-black/40 flex items-center justify-center px-8"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] bg-white rounded-[20px] p-7 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-[14px] bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-900 mb-1.5">
              {t('inbox.delete_title')}
            </h3>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
              {t('inbox.delete_confirm')}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 rounded-[14px] bg-slate-100 text-[15px] font-semibold text-slate-600 active:scale-[0.98] transition-transform"
              >
                {t('my_sims.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-3 rounded-[14px] bg-red-500 text-[15px] font-semibold text-white active:scale-[0.98] transition-transform"
              >
                {t('my_sims.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
