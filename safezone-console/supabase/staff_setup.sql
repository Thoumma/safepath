-- Run this in Supabase → SQL Editor AFTER you have:
--   1. run `npm run db:push` (creates the tables)
--   2. created three Auth users (Dashboard → Authentication → Add user):
--        officer@safezone.la   (embassy duty officer — sees all cases)
--        vfi@safezone.la       (VFI partner — sees only VFI cases)
--        safepath@safezone.la  (SafePath partner — sees only SafePath cases)
--
-- Then paste each new user's UID below and run this script. staff_users.id
-- must equal the auth.users id so the app can map a login to a role.

insert into staff_users (id, email, full_name, role, partner_code, partner_id)
values
  ('PASTE-OFFICER-AUTH-UID',  'officer@safezone.la',  'Somsak V. (Embassy)', 'OFFICER', null,        null),
  ('PASTE-VFI-AUTH-UID',      'vfi@safezone.la',      'VFI Duty',            'PARTNER', 'VFI',       (select id from partners where code = 'VFI')),
  ('PASTE-SAFEPATH-AUTH-UID', 'safepath@safezone.la', 'SafePath Duty',       'PARTNER', 'SAFEPATH',  (select id from partners where code = 'SAFEPATH'))
on conflict (id) do update
  set role = excluded.role,
      partner_code = excluded.partner_code,
      partner_id = excluded.partner_id;

-- OPTIONAL: enable Realtime on the cases table (Inbox live updates)
-- Dashboard → Database → Replication → enable `cases`, or:
alter publication supabase_realtime add table cases;
