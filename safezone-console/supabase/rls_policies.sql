-- SafeZone Response Console — row-level security.
--
-- Run AFTER `npm run db:push`. Re-runnable (idempotent).
--
-- Why this file exists: `prisma db push` creates tables with RLS OFF. The
-- publishable/anon key ships in the browser bundle and PostgREST answers it
-- directly, so without RLS anyone who opens devtools can read every case,
-- citizen and trusted contact — bypassing middleware.ts and caseScope()
-- entirely. Enabling RLS closes that door.
--
-- Why this does NOT break the app: Prisma connects as `postgres`, which owns
-- these tables and has rolbypassrls. Server-side queries (requireStaff,
-- /api/cases, /api/sos) are unaffected. RLS constrains only `anon` and
-- `authenticated` — i.e. the browser.
--
-- Model: deny by default. The browser needs exactly one thing from PostgREST —
-- a SELECT on `cases`, because Supabase Realtime evaluates RLS as the
-- subscribing user and delivers no postgres_changes events for rows that user
-- cannot select. Every other table gets RLS with zero policies: fully closed.

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so they read staff_users as the owner; without
-- that, a policy on `cases` that reads staff_users would recurse through
-- staff_users' own RLS. search_path is pinned so the definer rights cannot be
-- redirected to an attacker-supplied schema.
-- ---------------------------------------------------------------------------

-- staff_users.id is text (Prisma String) and auth.uid() is uuid, hence the cast.
create or replace function public.current_staff_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select role::text
  from public.staff_users
  where id = (select auth.uid())::text
  limit 1
$$;

create or replace function public.current_staff_partner_code()
  returns text
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select partner_code::text
  from public.staff_users
  where id = (select auth.uid())::text
  limit 1
$$;

revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.current_staff_partner_code() from public, anon;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.current_staff_partner_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. No policy on a table = no rows for anon/authenticated.
-- ---------------------------------------------------------------------------

alter table public.cases            enable row level security;
alter table public.case_events      enable row level security;
alter table public.citizens         enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.partners         enable row level security;
alter table public.responders       enable row level security;
alter table public.staff_users      enable row level security;

-- ---------------------------------------------------------------------------
-- The single exception: staff may SELECT cases within their scope. This mirrors
-- caseScope() in src/lib/auth.ts — ADMIN/OFFICER see everything, PARTNER sees
-- only cases routed to their partner. Keep the two in step.
--
-- Note this grants no INSERT/UPDATE/DELETE to the browser. All writes go
-- through Prisma on the server, which bypasses RLS as table owner.
-- ---------------------------------------------------------------------------

drop policy if exists "staff read cases in scope" on public.cases;
create policy "staff read cases in scope"
  on public.cases
  for select
  to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'OFFICER')
    or (
      public.current_staff_role() = 'PARTNER'
      and routed_to::text = public.current_staff_partner_code()
    )
  );

-- ---------------------------------------------------------------------------
-- sos_events: written directly by the mobile app with the publishable key.
--
-- Write-only for the app. INSERT is allowed; SELECT/UPDATE/DELETE are not, so
-- the same key that can report a location cannot read anyone else's back. The
-- console reads this table through Prisma (owner, bypasses RLS).
--
-- Accepted trade-off: the publishable key ships inside the APK, so anyone who
-- extracts it can insert junk rows. That is the standard Supabase anon-insert
-- posture — it cannot leak data, only add noise. If abuse shows up, move this
-- behind an Edge Function with a rate limit rather than widening SELECT.
-- ---------------------------------------------------------------------------

alter table public.sos_events enable row level security;

grant insert on public.sos_events to anon, authenticated;

drop policy if exists "app may report a location" on public.sos_events;
create policy "app may report a location"
  on public.sos_events
  for insert
  to anon, authenticated
  with check (true);

-- Realtime delivers postgres_changes only for tables in this publication.
-- Guarded so re-running the script does not error.
do $$
begin
  alter publication supabase_realtime add table public.cases;
exception
  when duplicate_object then null;
end
$$;
