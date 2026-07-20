-- SafeZone — row-level security for the case chat thread.
--
-- Run AFTER `npm run db:push` and AFTER `rls_policies.sql` (this file reuses
-- the SECURITY DEFINER helpers defined there). Re-runnable (idempotent).
--
-- Why this file exists at all: `case_messages` is the first table BOTH the
-- staff browser and the mobile app subscribe to over Supabase Realtime, and
-- Realtime evaluates RLS as the subscribing user — it delivers no
-- postgres_changes events for rows that user cannot SELECT. So chat needs real
-- SELECT policies, unlike `case_events`, which has RLS on with zero policies
-- and is therefore invisible to subscribers.
--
-- Reads only. There are deliberately NO insert/update/delete policies: every
-- write goes through Prisma as `postgres` (owner, bypasses RLS) via
-- /api/cases/[id]/messages and /api/me/case/messages. So a stolen anon key
-- cannot write anything, and the app cannot forge a message that appears to
-- come from the embassy.

alter table public.case_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Staff. Same scoping rule as `cases`: ADMIN/OFFICER see everything, a PARTNER
-- account sees only threads on cases routed to their organisation.
-- ---------------------------------------------------------------------------
drop policy if exists "staff read case messages in scope" on public.case_messages;
create policy "staff read case messages in scope"
  on public.case_messages
  for select
  to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'OFFICER')
    or exists (
      select 1
      from public.cases c
      where c.id = case_messages.case_id
        and c.routed_to::text = public.current_staff_partner_code()
    )
  );

-- ---------------------------------------------------------------------------
-- The citizen, from the mobile app.
--
-- Matched on the VERIFIED phone claim in the JWT — the same claim
-- `requireAppUser` insists on, issued by Supabase only after a real OTP
-- round-trip. Never on anything the client sends.
--
-- The `type <> 'DURESS'` clause is load-bearing and must not be "simplified"
-- away. A phone in an attacker's hands must not be able to discover that a
-- duress case exists, and Realtime would otherwise happily stream it a live
-- thread about the silent alarm the fake password just fired. This is the
-- second of three locks on that door; the others are the API filter in
-- /api/me/case/messages and the app's own decoy gate in ChatService.
-- ---------------------------------------------------------------------------
drop policy if exists "citizen reads own case messages" on public.case_messages;
create policy "citizen reads own case messages"
  on public.case_messages
  for select
  to authenticated
  using (
    coalesce(nullif((select auth.jwt() ->> 'phone'), ''), '') <> ''
    and exists (
      select 1
      from public.cases c
      join public.citizens z on z.id = c.citizen_id
      where c.id = case_messages.case_id
        and c.type <> 'DURESS'
        -- Supabase issues the `phone` claim WITHOUT a leading '+' while
        -- citizens.phone is stored E.164 *with* one (which is why
        -- lib/app-auth.ts re-adds it). Compare both sides stripped, or this
        -- policy silently matches nothing and Realtime goes quiet with no
        -- error anywhere.
        and ltrim(z.phone, '+') = ltrim((select auth.jwt() ->> 'phone'), '+')
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime delivery. Without this the policies above are correct but no
-- postgres_changes event is ever published for the table.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.case_messages;
exception
  when duplicate_object then null;
end $$;
