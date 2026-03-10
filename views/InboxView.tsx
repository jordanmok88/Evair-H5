import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Bell, Package, AlertTriangle, Clock, Tag, Zap } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../constants';
import { NotificationType } from '../types';
import FlagIcon from '../components/FlagIcon';

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

const InboxView: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = notifications.filter(n => FILTER_MAP[filter].includes(n.type));

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7]">
      {/* Header */}
      <div className="pt-safe px-5 pb-2 shrink-0 bg-[#F2F4F7] z-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('profile.inbox')}</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pb-32">
        {/* Unread count & mark all read */}
        {unreadCount > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">
              {t('inbox.unread_count', { count: unreadCount })}
            </span>
            <button onClick={markAllRead} className="text-xs font-bold text-brand-orange active:opacity-70">
              {t('inbox.mark_all_read')}
            </button>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
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
          <div className="space-y-3">
            {filtered.map(notif => {
              const cfg = NOTIF_CONFIG[notif.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={notif.id}
                  onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                  className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.99] ${
                    notif.read
                      ? 'bg-white border-slate-100'
                      : 'bg-white border-l-[3px] shadow-sm'
                  }`}
                  style={!notif.read ? { borderLeftColor: cfg.color } : undefined}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {notif.countryCode ? (
                        <div className="relative">
                          <FlagIcon countryCode={notif.countryCode} size="md" />
                          <div
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <Icon size={9} style={{ color: cfg.color }} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                          <Icon size={18} style={{ color: cfg.color }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-[13px] leading-tight ${notif.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                          {t(notif.titleKey)}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.read && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
                          <span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(notif.date)}</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 leading-relaxed mb-2">{t(notif.bodyKey)}</p>
                      {notif.actionLabel && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-3 py-1"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {t(notif.actionLabel)}
                          <ChevronRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
    </div>
  );
};

export default InboxView;
