-- ============================================================
-- Trip Planner — Supabase schema
-- Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again (everything is "if not exists" / "or replace").
-- ============================================================

-- Settings, custom destinations, PIN salt, AI summary cache
create table if not exists public.tp_kv (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- One row per friend: their trip preferences
create table if not exists public.tp_responses (
  name       text primary key,
  home_city  text,
  data       jsonb not null,
  updated_at text not null            -- India time, "YYYY-MM-DDTHH:MM:SS"
);

-- Hashed 4-digit PINs (never stored in plain text)
create table if not exists public.tp_pins (
  name       text primary key,
  hash       text not null,
  created_at timestamptz not null default now()
);

-- Votes: one answer per person per shortlisted option
create table if not exists public.tp_votes (
  name       text not null,
  option_key text not null,
  answer     text not null check (answer in ('in', 'maybe', 'cant')),
  at         text not null,
  primary key (name, option_key)
);

-- The single voting round: frozen shortlist + decision
create table if not exists public.tp_voting (
  id         int primary key default 1 check (id = 1),
  shortlist  jsonb,
  frozen_at  text not null default '',
  mode       text not null default '',
  decision   text not null default '',
  decided_at text not null default ''
);

-- Expiring counters: wrong-PIN lockouts and AI rate limits
create table if not exists public.tp_counters (
  key        text primary key,
  count      int not null default 0,
  expires_at timestamptz not null
);

-- Atomically add 1 to a counter; restarts the window once it has expired.
create or replace function public.tp_incr(p_key text, p_ttl int)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare c int;
begin
  insert into public.tp_counters (key, count, expires_at)
  values (p_key, 1, now() + make_interval(secs => p_ttl))
  on conflict (key) do update set
    count      = case when public.tp_counters.expires_at < now() then 1 else public.tp_counters.count + 1 end,
    expires_at = case when public.tp_counters.expires_at < now() then now() + make_interval(secs => p_ttl)
                      else public.tp_counters.expires_at end
  returning count into c;
  return c;
end $$;

-- Lock everything down: only the server (service role key) can read or write.
-- RLS on with no policies = the public anon key gets nothing.
alter table public.tp_kv        enable row level security;
alter table public.tp_responses enable row level security;
alter table public.tp_pins      enable row level security;
alter table public.tp_votes     enable row level security;
alter table public.tp_voting    enable row level security;
alter table public.tp_counters  enable row level security;

revoke all on function public.tp_incr(text, int) from public, anon, authenticated;
grant execute on function public.tp_incr(text, int) to service_role;

insert into public.tp_voting (id) values (1) on conflict (id) do nothing;
