/**
 * Chat provider 工厂 + 选路
 *
 * 决策顺序（VITE_CHAT_PROVIDER）：
 *   - 'laravel' | 'supabase' | 'local'：强制使用对应 provider
 *   - 'auto'（默认）：登录态 + Reverb 配置齐 → laravel；否则 Supabase；都不行 → local
 *
 * Runtime override：localStorage('evair-chat-provider') 覆盖 env，方便 QA 切换。
 */

import { isAuthenticated } from '../api/client';
import { supabaseConfigured } from '../supabase';
import { createLaravelProvider } from './laravelProvider';
import { createLocalProvider } from './localProvider';
import { createSupabaseProvider } from './supabaseProvider';
import type { ChatProvider, ChatProviderName } from './types';

const STORAGE_KEY = 'evair-chat-provider';

function readEnvProvider(): ChatProviderName | 'auto' {
  const v = (import.meta.env.VITE_CHAT_PROVIDER as string | undefined)?.toLowerCase();
  if (v === 'laravel' || v === 'supabase' || v === 'local' || v === 'auto') return v;
  return 'auto';
}

function readOverride(): ChatProviderName | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.toLowerCase();
    if (v === 'laravel' || v === 'supabase' || v === 'local') return v;
  } catch { /* SSR / privacy mode */ }
  return null;
}

function isReverbConfigured(): boolean {
  return !!(import.meta.env.VITE_REVERB_KEY && import.meta.env.VITE_REVERB_HOST);
}

export function setChatProviderOverride(name: ChatProviderName | null): void {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

export function resolveProviderName(): ChatProviderName {
  const override = readOverride();
  if (override) return override;
  const env = readEnvProvider();
  if (env !== 'auto') return env;

  // auto 决策
  if (isAuthenticated() && isReverbConfigured()) return 'laravel';
  if (supabaseConfigured) return 'supabase';
  return 'local';
}

export function createChatProvider(name?: ChatProviderName): ChatProvider {
  const target = name ?? resolveProviderName();
  switch (target) {
    case 'laravel': return createLaravelProvider();
    case 'supabase': return createSupabaseProvider();
    case 'local':
    default: return createLocalProvider();
  }
}

// ─── 共享单例（acquire / release）─────────────────────────────────
//
// 多个组件（ContactUsView + SupportFab）需要共享同一个 provider，
// 否则会针对同一会话开两个 Reverb 订阅、未读计数与视图状态错位。
// 用引用计数：第一个 acquire 时创建，最后一个 release 时 dispose。
//
// 关键：dispose 延迟 800ms 触发——React 在 Tab 切换时会先卸载旧组件
// （release）再挂载新组件（acquire），如果立刻 dispose 会导致 provider
// 在切换瞬间被销毁后立刻重建，丢失会话状态并触发 Reverb 重连。

const DISPOSE_DELAY_MS = 800;

let shared: ChatProvider | null = null;
let refCount = 0;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;

export function acquireSharedChatProvider(): ChatProvider {
  if (disposeTimer) {
    clearTimeout(disposeTimer);
    disposeTimer = null;
  }
  if (!shared) {
    shared = createChatProvider();
  }
  refCount += 1;
  return shared;
}

export function releaseSharedChatProvider(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0 || !shared) return;
  if (disposeTimer) clearTimeout(disposeTimer);
  disposeTimer = setTimeout(() => {
    disposeTimer = null;
    if (refCount === 0 && shared) {
      shared.dispose();
      shared = null;
    }
  }, DISPOSE_DELAY_MS);
}

export function peekSharedChatProvider(): ChatProvider | null {
  return shared;
}

export type { ChatProvider, ChatProviderName } from './types';
export * from './types';
