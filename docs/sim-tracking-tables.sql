-- Run this in Supabase SQL Editor
-- Creates tables for SIM batch tracking and activation analytics

-- ─── SIM Batches (ICCID registry) ────────────────────────────────

create table if not exists public.sim_batches (
  id          uuid primary key default gen_random_uuid(),
  batch_name  text not null,
  channel     text not null default 'other',        -- amazon, temu, website, other
  iccid_start text,                                  -- for range input (nullable)
  iccid_end   text,                                  -- for range input (nullable)
  iccids      text[],                                -- for paste/CSV individual ICCIDs (nullable)
  total_count int not null default 0,
  ship_date   date,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sim_batches_channel on public.sim_batches (channel);
create index if not exists idx_sim_batches_created on public.sim_batches (created_at desc);

alter table public.sim_batches enable row level security;

create policy "Authenticated users can manage batches"
  on public.sim_batches for all
  to authenticated
  using (true)
  with check (true);

-- ─── SIM Activations (logged when customer binds) ────────────────

create table if not exists public.sim_activations (
  id           uuid primary key default gen_random_uuid(),
  iccid        text not null,
  activated_at timestamptz not null default now(),
  batch_id     uuid references public.sim_batches(id) on delete set null,
  channel      text,                                  -- resolved from batch
  country      text,
  region       text,                                  -- US state / subdivision
  city         text,
  device       text,
  user_agent   text
);

create index if not exists idx_sim_activations_iccid      on public.sim_activations (iccid);
create index if not exists idx_sim_activations_channel     on public.sim_activations (channel);
create index if not exists idx_sim_activations_activated   on public.sim_activations (activated_at desc);
create index if not exists idx_sim_activations_batch       on public.sim_activations (batch_id);

alter table public.sim_activations enable row level security;

-- Anyone can insert (customer app logs activations with anon key)
create policy "Anon can insert activations"
  on public.sim_activations for insert
  to anon
  with check (true);

-- Authenticated (admin) can read all
create policy "Authenticated can read activations"
  on public.sim_activations for select
  to authenticated
  using (true);

-- Service role has full access (for Netlify functions)
create policy "Service role full access activations"
  on public.sim_activations for all
  to service_role
  using (true)
  with check (true);

-- ─── Update qr_scans to add region column (if not exists) ───────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'qr_scans' and column_name = 'region'
  ) then
    alter table public.qr_scans add column region text;
  end if;
end $$;

-- ─── Helper function: lookup batch by ICCID ─────────────────────

create or replace function public.lookup_batch_by_iccid(p_iccid text)
returns table(batch_id uuid, channel text) as $$
  select id as batch_id, channel
  from public.sim_batches
  where
    (iccid_start is not null and iccid_end is not null
     and p_iccid >= iccid_start and p_iccid <= iccid_end)
    or (iccids is not null and p_iccid = any(iccids))
  limit 1;
$$ language sql stable;
