-- ============================================================================
-- SENTINEL CTF — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- RLS is enabled on every table with NO policies, so the anon/authenticated
-- keys can read nothing directly. All access goes through the serverless API
-- using the service-role key, which bypasses RLS.
-- ============================================================================

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null default 'Responder',
  role              text not null default 'player' check (role in ('player','admin')),
  is_disabled       boolean not null default false,
  hidden_from_board boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ---------- challenges ----------
create table if not exists public.challenges (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  stage_no       int,
  title          text not null,
  category       text,
  difficulty     text not null default 'Easy',
  points         int  not null default 100,
  description_md text,
  case_sensitive boolean not null default true,
  is_visible     boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- challenge_flags (never exposed to clients) ----------
create table if not exists public.challenge_flags (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  flag_hmac    text not null,
  decoy_hmac   text,
  updated_at   timestamptz not null default now()
);

-- ---------- evidence files ----------
create table if not exists public.challenge_files (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  display_name text not null,
  storage_path text not null,
  size_bytes   bigint,
  sha256       text,
  created_at   timestamptz not null default now()
);

-- ---------- access links (primary / backup) for live challenges ----------
create table if not exists public.challenge_endpoints (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  label        text not null default 'Primary',
  url          text not null,
  kind         text not null default 'primary' check (kind in ('primary','backup')),
  note         text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---------- hints (intel) ----------
create table if not exists public.hints (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  position     int not null default 1,
  cost         int not null default 10,
  content_md   text not null default ''
);

-- ---------- hint unlocks ----------
create table if not exists public.hint_unlocks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  hint_id     uuid not null references public.hints(id) on delete cascade,
  cost_paid   int not null default 0,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, hint_id)
);

-- ---------- submissions (audit log) ----------
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  is_correct     boolean not null,
  submitted_text text,
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_sub_user_time on public.submissions (user_id, created_at desc);

-- ---------- solves (one per user+challenge) ----------
create table if not exists public.solves (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  points_awarded int not null default 0,
  solved_at      timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

-- ---------- announcements (broadcasts) ----------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  level      text not null default 'info',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Scoreboard view — score = solve points minus hint costs.
-- security_invoker = true makes it honour the caller's RLS (anon sees nothing;
-- the service role bypasses RLS and sees everything).
-- ============================================================================
create or replace view public.scoreboard
with (security_invoker = true) as
select
  p.id as user_id,
  p.display_name,
  coalesce(sol.pts, 0) - coalesce(h.spent, 0) as score,
  coalesce(sol.cnt, 0) as solved_count,
  coalesce(h.spent, 0) as hint_spent,
  greatest(coalesce(sol.last_solved, 'epoch'::timestamptz),
           coalesce(h.last_unlock, 'epoch'::timestamptz)) as last_score_at
from public.profiles p
left join (
  select user_id, sum(points_awarded) pts, count(*) cnt, max(solved_at) last_solved
  from public.solves group by user_id
) sol on sol.user_id = p.id
left join (
  select user_id, sum(cost_paid) spent, max(unlocked_at) last_unlock
  from public.hint_unlocks group by user_id
) h on h.user_id = p.id
where p.role <> 'admin' and p.is_disabled = false and p.hidden_from_board = false;

-- ============================================================================
-- Enable RLS everywhere, with NO policies (default deny for anon/authenticated).
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.challenges          enable row level security;
alter table public.challenge_flags     enable row level security;
alter table public.challenge_files     enable row level security;
alter table public.challenge_endpoints enable row level security;
alter table public.hints               enable row level security;
alter table public.hint_unlocks        enable row level security;
alter table public.submissions         enable row level security;
alter table public.solves              enable row level security;
alter table public.announcements       enable row level security;

-- Defence in depth: revoke direct table/view grants from the public API roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on public.scoreboard from anon, authenticated;

-- ============================================================================
-- Auto-create a profile row whenever a new auth user is created.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'player'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
