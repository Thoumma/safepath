# SafeZone Response Console

One web console for the **Embassy**, **VFI**, and **SafePath**. Every SOS from the
SafeZone mobile app becomes a **Case** that is routed to the partner who should
handle it. The core screen — the **Case Helper** — puts everything a responder
needs (live location, victim + passport, trusted contacts, the connection graph,
and a running timeline) on one page, so help starts in seconds.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui ·
Prisma · Supabase (Postgres + Auth + Realtime)**. UI is Lao-first and uses the
SafeZone app palette (passport navy, signal red, trust emerald, warm paper).

## Functions

| Area | What it does |
|------|--------------|
| **SOS intake** | `POST /api/sos` — the mobile app posts a passport + GPS; a Case is created and routed. |
| **SOS Inbox** | Live list of cases (Supabase Realtime), newest first, scoped to your role. |
| **Case Helper** | Live map, victim/passport, trusted contacts, connection graph, timeline; actions: assign responder, route to partner, add note, resolve. |
| **Citizens** | Searchable directory of registered travellers + their trusted contacts. |
| **Reports** | Cases by type / country / month, resolved rate, response-time trend. |
| **Auth + roles** | Supabase Auth login. `OFFICER`/`ADMIN` see all cases; `PARTNER` sees only cases routed to their partner. |

Tables: `citizens`, `trusted_contacts`, `partners`, `responders`, `cases`,
`case_events`, `staff_users`.

## Setup

> Run these on your machine (Windows). `.env.local` is already filled in except
> the Supabase **anon key** — paste it from Supabase → Project Settings → API.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) pull the official Radix-backed shadcn components via npx.
#    Lean versions are already included so the app runs without this step.
npx shadcn@latest add button card input label textarea table badge separator

# 3. Push the schema to Supabase and seed demo data
npm run db:push
npm run db:seed

# 4. Create staff logins:
#    Supabase → Authentication → Add user (email + password), e.g.
#      officer@safezone.la · vfi@safezone.la · safepath@safezone.la
#    Then paste their UIDs into supabase/staff_setup.sql and run it in the
#    Supabase SQL editor (also enables Realtime on `cases`).

# 5. Run
npm run dev        # http://localhost:3000
```

## Testing the SOS intake

```bash
curl -X POST http://localhost:3000/api/sos -H "Content-Type: application/json" -d '{
  "passportNo": "P1234567",
  "fullName": "ນາງ ຄຳຫລ້າ ພົມມະ",
  "type": "ອຸບັດຕິເຫດ / Accident",
  "severity": "CRITICAL",
  "lat": 13.746, "lng": 100.534, "city": "Bangkok", "country": "TH",
  "routedTo": "EMBASSY"
}'
```

The new case appears in the Inbox instantly (Realtime).

**`/api/sos` and `/api/me/*` require a Supabase access token** carrying a
verified `phone` claim — the one the mobile app receives after passing SMS
verification (see `src/lib/app-auth.ts`). Send it as
`Authorization: Bearer <access_token>`; the citizen's phone is taken from that
claim and never from the request body, so a caller cannot file a case under
someone else's number.

This replaced `SOS_INGEST_TOKEN`, a single shared bearer. That token had to be
compiled into the shipped APK, which meant it was not a secret: anyone could
extract it and forge cases into the embassy's inbox.

## Security notes

- `.env.local` holds the DB password and is gitignored. **Rotate the Supabase
  DB password** — it was shared in chat during setup.
- `staff_users.id` must equal the Supabase `auth.users` id; that mapping is what
  gives each login its role and partner scope.
- Reports' month/response-time panels use a representative baseline; the type and
  country panels are live from your data.

## Where things live

```
prisma/schema.prisma      data model
prisma/seed.ts            demo partners, citizens, cases
supabase/staff_setup.sql  staff role mapping + realtime
src/app/(dashboard)/      dashboard · inbox · cases/[id] · citizens · reports
src/app/api/              sos · cases · cases/[id] · cases/[id]/events
src/lib/                  prisma, supabase clients, auth + scope, queries
src/components/           sidebar, case row/actions, realtime inbox, charts, ui/
```
