-- ============================================================
-- Evair H5 — Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- 1) Notifications table  (admin-created promos / service messages)
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('promo','service')),
  title_en    text not null default '',
  title_zh    text not null default '',
  title_es    text not null default '',
  body_en     text not null default '',
  body_zh     text not null default '',
  body_es     text not null default '',
  action_label text,          -- e.g. "Shop Now"
  action_target text,         -- e.g. "ESIM" (tab to navigate to)
  country_code text,          -- optional, for flag display
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

-- Everyone can read active notifications (no auth needed for customers)
create policy "Public read active notifications"
  on notifications for select
  using (active = true);

-- Only authenticated admins can insert/update/delete
create policy "Admins manage notifications"
  on notifications for all
  using (auth.role() = 'authenticated');


-- 2) Conversations table
create table if not exists conversations (
  id            uuid primary key default gen_random_uuid(),
  customer_id   text not null,              -- anonymous UUID from localStorage
  customer_name text,                       -- display name (from logged-in user, or 'Guest')
  status        text not null default 'open'
                  check (status in ('open','needs_human','resolved')),
  topic         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table conversations enable row level security;

-- Customers can read/create their own conversations
create policy "Customer read own conversations"
  on conversations for select
  using (true);

create policy "Customer create conversations"
  on conversations for insert
  with check (true);

create policy "Customer update own conversations"
  on conversations for update
  using (true);

-- Admins can read/update all
create policy "Admins manage conversations"
  on conversations for all
  using (auth.role() = 'authenticated');


-- 3) Chat messages table
create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender          text not null check (sender in ('customer','ai','agent')),
  agent_name      text,                   -- e.g. "Jordan" for human agents
  content         text not null,
  english_content text,                   -- English translation for admin reference
  created_at      timestamptz not null default now()
);

alter table chat_messages enable row level security;

-- Customers can read messages in their conversation
create policy "Public read messages"
  on chat_messages for select
  using (true);

create policy "Public insert messages"
  on chat_messages for insert
  with check (true);

-- Admins can do everything
create policy "Admins manage messages"
  on chat_messages for all
  using (auth.role() = 'authenticated');


-- 4) Indexes for performance
create index if not exists idx_notifications_active
  on notifications (active, created_at desc);

create index if not exists idx_conversations_status
  on conversations (status, updated_at desc);

create index if not exists idx_messages_conversation
  on chat_messages (conversation_id, created_at);


-- 5) Enable Realtime for chat
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table conversations;
