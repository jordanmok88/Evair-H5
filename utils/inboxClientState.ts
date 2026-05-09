/**
 * Laravel inbox rows are re-fetched with `read: false` every time. Without a
 * client overlay, "mark read" / delete snap back on the next focus pull.
 * Persist read + dismissed ids in localStorage (cleared on logout).
 */
import type { AppNotification } from '../types';

const READ_KEY = 'evair_inbox_read_ids_v1';
const DISMISSED_KEY = 'evair_inbox_dismissed_ids_v1';

function parseIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0));
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* quota / private mode */
  }
}

/** Merge server rows with stored read + dismissed flags (drops dismissed). */
export function applyInboxClientState(rows: AppNotification[]): AppNotification[] {
  const read = parseIdSet(READ_KEY);
  const dismissed = parseIdSet(DISMISSED_KEY);
  return rows
    .filter((r) => !dismissed.has(r.id))
    .map((r) => ({ ...r, read: r.read || read.has(r.id) }));
}

export function inboxMarkRead(id: string): void {
  const s = parseIdSet(READ_KEY);
  s.add(id);
  saveIdSet(READ_KEY, s);
}

export function inboxMarkAllRead(ids: string[]): void {
  if (ids.length === 0) return;
  const s = parseIdSet(READ_KEY);
  ids.forEach((id) => s.add(id));
  saveIdSet(READ_KEY, s);
}

export function inboxDismiss(id: string): void {
  const s = parseIdSet(DISMISSED_KEY);
  s.add(id);
  saveIdSet(DISMISSED_KEY, s);
}

export function clearInboxClientState(): void {
  try {
    localStorage.removeItem(READ_KEY);
    localStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* noop */
  }
}
