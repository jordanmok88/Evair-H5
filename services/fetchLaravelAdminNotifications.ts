/**
 * Public App API: admin-authored notifications (Laravel `notifications` table).
 * GET /api/v1/app/notifications — no auth; optional `country_code` matches Laravel filter.
 */
import type { AppNotification, NotificationType } from '../types';
import { getBaseUrl } from './api/client';

function isLaravelSuccess(code: unknown): boolean {
  return code === 0 || code === '0' || code === 200 || code === '200';
}

function mapAdminType(raw: string): NotificationType {
  const t = raw.toLowerCase();
  if (t.includes('service') || t.includes('system')) return 'service';
  return 'promo';
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return '';
}

export interface FetchLaravelAdminNotificationsOptions {
  /** Forwarded as `country_code` query (global + this country). */
  countryCode?: string | null;
}

/**
 * Fetches active notifications from Laravel (same source as Evair admin panel).
 * Returns [] on network or envelope errors (best-effort; no throw).
 */
export async function fetchLaravelAdminNotifications(
  _lang: string,
  opts?: FetchLaravelAdminNotificationsOptions,
): Promise<AppNotification[]> {
  const base = getBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}/app/notifications`);
  const cc = opts?.countryCode?.trim();
  if (cc) url.searchParams.set('country_code', cc.slice(0, 10));

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { code?: unknown; data?: unknown };
    if (!isLaravelSuccess(json.code)) return [];
    const data = json.data;
    if (!Array.isArray(data)) return [];

    return data.map((item: unknown, index: number) => {
      const row = item as Record<string, unknown>;
      const id = pickStr(row, 'id');
      const type = mapAdminType(pickStr(row, 'type'));
      const title = pickStr(row, 'title', 'title_en');
      const body = pickStr(row, 'body', 'body_en');
      const actionLabel = pickStr(row, 'action_label', 'actionLabel');
      const created = pickStr(row, 'created_at', 'createdAt');
      const country = pickStr(row, 'country_code', 'countryCode');

      return {
        id: id ? `laravel-${id}` : `laravel-row-${index}`,
        type,
        titleKey: `__raw:${title}`,
        bodyKey: `__raw:${body}`,
        date: created || new Date().toISOString(),
        read: false,
        ...(actionLabel ? { actionLabel: `__raw:${actionLabel}` } : {}),
        ...(country ? { countryCode: country } : {}),
      } satisfies AppNotification;
    });
  } catch {
    return [];
  }
}
