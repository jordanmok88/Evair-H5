-- Run this in Supabase SQL Editor to create the qr_scans table
-- Tracks every QR code scan with source, device, and geo info

create table if not exists public.qr_scans (
  id          uuid primary key default gen_random_uuid(),
  scanned_at  timestamptz not null default now(),
  source      text not null default 'direct',   -- 'amazon', 'temu', 'card', 'direct'
  country     text,                               -- ISO country code from geo headers
  city        text,
  device      text,                               -- 'iPhone', 'Android', 'iPad', etc.
  user_agent  text,
  ip_hash     text                                -- first 16 chars of SHA-256 for privacy
);

-- Index for dashboard queries
create index if not exists idx_qr_scans_scanned_at on public.qr_scans (scanned_at desc);
create index if not exists idx_qr_scans_source     on public.qr_scans (source);

-- Allow the service_role key to insert (default behavior, but explicit for clarity)
alter table public.qr_scans enable row level security;

create policy "Service role can insert"
  on public.qr_scans for insert
  to service_role
  with check (true);

create policy "Service role can read"
  on public.qr_scans for select
  to service_role
  using (true);
