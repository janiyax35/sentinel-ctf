-- ============================================================================
-- Migration: leaderboard moderation (ban / hide-from-board + reset)
-- Run this once in the Supabase SQL editor on an existing deployment.
-- It ADDS to the schema and does not remove or change existing data.
-- ============================================================================

-- New flag: hide a responder from the leaderboard without banning their login.
alter table public.profiles
  add column if not exists hidden_from_board boolean not null default false;

-- Rebuild the scoreboard view to also exclude hidden responders.
-- (Banned users, is_disabled = true, were already excluded.)
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
where p.role <> 'admin'
  and p.is_disabled = false
  and p.hidden_from_board = false;

revoke all on public.scoreboard from anon, authenticated;
