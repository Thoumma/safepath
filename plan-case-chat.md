# Plan: two-way chat between the app and the response console

**Status:** plan only — no code written yet.
**Decisions taken with the owner:** chat exists **only while a case is open**;
delivery is **Supabase Realtime** (live while the screen is open).

---

## 1. Context — why this is the next thing to build

Today the loop between a person in trouble and the duty officer is one-way and
lossy. The app can raise an alarm (`POST /api/sos`), stream GPS
(`/api/me/case/track`) and stand the alarm down (`POST /api/me/case`). The
officer can write notes into the case timeline. **Neither can ask the other a
question.**

That gap is where real cases stall. "Are you somewhere safe right now?" "Is
anyone with you?" "Can you get to the bus station?" — none of that fits in a
GPS ping, and today it can only happen if the officer phones a number the
person may not be able to answer. A text thread works where a call does not:
it is quiet, it survives a bad line, and it leaves a record on the case.

**Outcome:** an officer opens a case and can talk to the person, in Lao, with
every message on the case record — and the person can reply from the same
screen that shows their open alarm.

---

## 2. The three constraints that shape the design

1. **DURESS cases must stay invisible to the device.** `/api/me/case` and
   `/api/me/case/track` both filter `type: { not: "DURESS" }` — the phone must
   never learn a duress case exists, because an attacker may be holding it.
   Chat must carry the same filter **in the API and in the RLS policy**, or it
   becomes the tell that defeats the silent alarm.
2. **Realtime is gated by RLS.** `supabase/rls_policies.sql` states it plainly:
   *Realtime evaluates RLS as the subscribing user and delivers no
   `postgres_changes` events for rows that user cannot select.* `case_events`
   has RLS enabled with **zero policies**, so it is invisible to subscribers.
   A chat table therefore needs a deliberate, hand-written SELECT policy — this
   is the one place where a mistake leaks a conversation.
3. **Offline-first.** A message composed with no signal must queue and send
   later, exactly like `SosOutbox`. Unlike a GPS fix, message text can
   legitimately repeat, so retries need a client-generated id for idempotency.

---

## 3. Data model

New table + enum in `safezone-console/prisma/schema.prisma`:

```prisma
enum MessageDirection {
  FROM_CITIZEN
  FROM_STAFF
}

/// One message in the case thread. Deliberately NOT CaseEvent: that is
/// one-directional narration for the officer's audit trail, with no direction,
/// no read state and no author id. Mixing a conversation into it would make
/// the timeline unreadable and the audit trail unprovable.
model CaseMessage {
  id         String           @id @default(uuid())
  caseId     String           @map("case_id")
  case       Case             @relation(fields: [caseId], references: [id], onDelete: Cascade)
  direction  MessageDirection
  body       String
  /// Staff author. Null for citizen messages. `authorName` is denormalised for
  /// display, matching CaseEvent.actor; `staffId` is the stable identity.
  staffId    String?          @map("staff_id")
  authorName String?          @map("author_name")
  /// App-generated uuid. Makes the offline outbox safe to retry: the same
  /// message re-sent after a failed flush collapses onto one row.
  clientId   String?          @map("client_id")
  readByStaffAt   DateTime?   @map("read_by_staff_at")   @db.Timestamptz(3)
  readByCitizenAt DateTime?   @map("read_by_citizen_at") @db.Timestamptz(3)
  createdAt  DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)

  @@unique([caseId, clientId])
  @@index([caseId, createdAt])
  @@map("case_messages")
}
```

Add `messages CaseMessage[]` to `Case`. Needs `npm run db:push`.

**Also fix while here:** `case_events` has no index at all. Add
`@@index([caseId, createdAt])` — the case page orders by it on every load.

---

## 4. Console API + UI

### Endpoints (follow the existing `fetch`-to-API-route convention on this page,
not server actions — `case-actions.tsx` already works this way)

| Route | Method | Body | Notes |
|---|---|---|---|
| `/api/cases/[id]/messages` | GET | — | `requireStaff()` + `caseScope` nested as `where: { case: { ...caseScope(staff) } }` |
| `/api/cases/[id]/messages` | POST | `{ body }` | Creates `FROM_STAFF`, `staffId: staff.id`, `authorName: staff.fullName ?? staff.email`; marks inbound messages read |

Reuse `requireStaff`/`caseScope` from `src/lib/auth.ts`. Mirror the shape of the
existing `src/app/api/cases/[id]/events/route.ts` (scope-check the case first,
404 if not in scope).

### UI

- **New** `src/components/case-chat.tsx` (`"use client"`) — a third card in the
  right column of `src/app/admin/(panel)/cases/[id]/page.tsx`, under the
  Response timeline. Takes `caseId` + initial messages as props (the RSC page
  already loads the case; add `messages: { orderBy: { createdAt: "asc" } }` to
  its `include`).
- **Realtime**: copy `src/components/realtime-inbox.tsx` exactly — subscribe to
  `postgres_changes` on `case_messages`, use the event as a **bare trigger**
  carrying no payload, then refetch `GET /api/cases/[id]/messages`. Keep its
  `live` dot ("Live" / "Realtime disconnected"). Filter the channel by
  `filter: \`case_id=eq.${caseId}\`` so one open case does not wake on another's
  traffic.
- Composer disabled when `status === "RESOLVED"`, matching how the note box
  hides on a resolved case today.
- **Unread badge**: add a count of `FROM_CITIZEN` messages with
  `readByStaffAt: null` to the inbox list and to the sidebar's SOS badge
  computation in `src/app/admin/(panel)/layout.tsx`. Officers must see "someone
  replied" without opening every case.

---

## 5. App API + UI

### Endpoints (`safezone-console/src/app/api/me/case/messages/route.ts`)

| Method | Request | Response |
|---|---|---|
| GET | `?since=<iso>` (optional) | `{ messages: [{ id, direction, body, authorName, createdAt }], unread: number }` |
| POST | `{ body, clientId, composedAt }` | `{ id, createdAt }` — idempotent via `upsert` on `@@unique([caseId, clientId])` |

Both resolve the case the same way `/api/me/case` does — newest open case for
`citizen.phone == caller.phone`, **with `type: { not: "DURESS" }`** — and both
return an empty/no-op result rather than an error when there is no open case.
GET marks `FROM_STAFF` messages as `readByCitizenAt`.

Add to `safezone/lib/config/console_config.dart`:
`caseMessagesEndpoint => Uri.parse('$baseUrl/api/me/case/messages')`.

### `safezone/lib/services/chat_service.dart` (new singleton)

Follow `GuardianService`'s **result-enum** shape, not `CaseService`'s
nullable-only shape — a chat screen must distinguish "no messages yet" from
"offline", which a bare `null` cannot express:

```dart
enum ChatState { ok, noCase, offline, failed }
class ChatResult { final ChatState state; final List<ChatMessage> messages; final int unread; }

class ChatService {
  ChatService._();
  static final ChatService instance = ChatService._();
  Future<ChatResult> load();                 // decoy-gated FIRST
  Future<bool> send(String body);            // enqueues on failure
  void stop();                               // tears down the realtime channel
}
```

**Duress gate — the exact convention from `guardian_service.dart:43`:** in decoy
mode return `const ChatResult(ChatState.ok)` — an ordinary *empty thread*, never
a distinct state and never different wording. A "chat unavailable" message would
be a tell. Gate before any network call so the request itself is unobservable.

`AuthService.lock()` must call `ChatService.instance.stop()` alongside the
existing `LiveTrackingService.instance.stop()` and `JourneyService.instance.stop()`.

### Offline: `safezone/lib/services/chat_outbox.dart` + `models/pending_message.dart`

Copy `sos_outbox.dart` almost verbatim — `FlutterSecureStorage`, key
`chat_outbox_v1`, corrupt-queue-wipes-itself, cap at 20, oldest dropped first.
Two deliberate differences from the SOS outbox:
- each entry carries a **`clientId` (uuid)** so a retry is idempotent server-side;
- each carries **`composedAt`**, so a message that sends an hour late still
  shows when it was written — same reasoning as `PendingSos.occurredAt`.

Flush from the same two triggers as `SosOutbox`: `main.dart` startup and the
first line of `HomeScreen._refresh()`. Note the SOS flush deliberately runs
*above* the decoy gate; **the chat flush must run below it** — a queued chat
message is not an emergency and must not leave a coerced device.

### UI

- **New** `safezone/lib/screens/chat_screen.dart`, registered in `router.dart`
  as a top-level route with `parentNavigatorKey: _rootKey` (path `/chat`),
  exactly like `/guardian-map`. Not a fifth bottom-bar tab: the thread only
  exists while a case does, and four tabs is already the practical ceiling.
- Entry point: a **"ຂໍ້ຄວາມຈາກສະຖານທູດ" button with an unread count on the
  existing open-case banner** in `home_screen.dart` (`_openCaseBanner`), above
  the SOS button. That banner is already the "you have an active alarm" surface.
- Poll every 15s while the screen is open using the
  `guardian_screen.dart:_syncLivePolling` pattern (timer in the *screen*, not
  the service; cancelled in `dispose`). Realtime is the fast path; **polling
  stays as the backstop** so the feature still works when Realtime is
  unreachable or Supabase is unconfigured.

### Realtime from Flutter

`supabase_flutter 2.14` + `realtime_client 2.2` are already installed and the
app holds a real authenticated session (phone-claim JWT). Subscribe only when
`SosServer.instance.isReady` — `Supabase.initialize` is skipped entirely when
unconfigured. This is the app's **first data-plane read via Supabase** (today it
uses Supabase only for auth), so the RLS policy below is what makes it safe.

---

## 6. The SQL — the security-critical part

New `safezone-console/supabase/chat_policies.sql`, following the existing
`rls_policies.sql` conventions (`SECURITY DEFINER` helpers, `do $$ … exception
when duplicate_object`):

```sql
alter table public.case_messages enable row level security;

-- Staff: same scoping helpers the cases policy already uses.
create policy "staff read case messages in scope" on public.case_messages
for select to authenticated using (
  public.current_staff_role() in ('ADMIN','OFFICER')
  or exists (
    select 1 from public.cases c
    where c.id = case_messages.case_id
      and c.routed_to = public.current_staff_partner_code()
  )
);

-- The citizen: their own case only, by VERIFIED phone claim, and never DURESS.
create policy "citizen reads own case messages" on public.case_messages
for select to authenticated using (
  exists (
    select 1 from public.cases c
    join public.citizens z on z.id = c.citizen_id
    where c.id = case_messages.case_id
      and c.type <> 'DURESS'
      and z.phone = (auth.jwt() ->> 'phone')
  )
);

-- Realtime delivery requires the table to be in the publication.
do $$ begin
  alter publication supabase_realtime add table public.case_messages;
exception when duplicate_object then null; end $$;
```

**No INSERT/UPDATE policies.** Every write goes through Prisma as the owner,
which bypasses RLS — so the app cannot forge a message from staff, and a
compromised anon key cannot write anything. Reads are the only grant.

The `c.type <> 'DURESS'` line is the second lock on the duress door; the first
is the API filter, the third is the client-side decoy gate.

---

## 7. Task order

**Phase A — backend**
1. Prisma: `CaseMessage` + `MessageDirection` + `Case.messages`, and the missing
   `@@index([caseId, createdAt])` on `CaseEvent`. `npm run db:push`.
2. `/api/cases/[id]/messages` (GET/POST).
3. `/api/me/case/messages` (GET/POST) with the DURESS filter and clientId upsert.
4. `supabase/chat_policies.sql` — **must be run by hand in the Supabase SQL
   editor**, like the existing RLS files.

**Phase B — console UI**
5. `case-chat.tsx` + wire into the case page; extend the page's `include`.
6. Unread counts on the inbox + sidebar badge.

**Phase C — app**
7. `models/chat_message.dart`, `models/pending_message.dart`.
8. `chat_outbox.dart`, then `chat_service.dart` **with the decoy gate written
   first, not bolted on**.
9. `AuthService.lock()` → `ChatService.instance.stop()`.
10. `chat_screen.dart` + `/chat` route + the banner entry point with unread count.
11. Realtime subscription behind `SosServer.instance.isReady`, polling backstop.

**Phase D — tests**
12. `test/chat_service_test.dart`, mirroring `test/journey_service_test.dart`:
    decoy session returns an empty *ok* thread and makes no request; `lock()`
    tears down the subscription; outbox retry with the same `clientId` does not
    duplicate.
13. `flutter analyze` + full suite; console `tsc --noEmit` + `next build`.

**New convention to introduce (flag it in review):** there is currently **no
HTTP seam anywhere** in the app — every service calls `http.post` directly and
none of those paths are unit-tested. `ChatService` should take a
`static http.Client Function()? clientOverride` seam in the existing static-seam
style, so send/retry/idempotency can actually be tested.

---

## 8. Verification

- `npm run db:push`, then run `supabase/chat_policies.sql` in the SQL editor.
- Console: `npx tsc --noEmit`, `npm run build` (stop `next dev` first — it holds
  `.next`), open a seeded case, send a message.
- App via `safezone/run-lan.ps1`: press SOS → open the banner's chat →
  send → message appears on the case page **without a manual refresh**
  (proves Realtime + the RLS policy) → officer replies → appears on the phone.
- **Duress drill (mandatory):** unlock with the fake password and confirm the
  chat entry point is absent, the thread is empty, `/api/me/case/messages` is
  never called, and a `psql` SELECT as the citizen role returns no rows for a
  DURESS case.
- Offline drill: airplane mode → send → message shows as queued → restore
  network → flushes once, and re-flushing does not duplicate it.

---

## 9. Risks and non-goals

- **No push notifications.** The app has no FCM and no local-notification
  package; a reply is seen only when the person opens the app. Adding push is a
  separate, larger piece of work — and any visible notification is, by this
  codebase's own standard, a potential decoy tell that would need suppressing in
  decoy mode and tearing down in `lock()`. **This is the biggest functional
  limitation of the feature and should be stated plainly in the UI copy** rather
  than implied away.
- **Chat is only as good as the staffing behind it.** An unanswered message from
  someone in danger is worse than no chat at all. Before enabling this, decide
  who answers and within what time, and consider an explicit in-app line telling
  the user when someone is likely to reply, plus a "call instead" affordance.
- **Blocked on Supabase Phone Auth**, like every other `/api/me/*` feature — no
  verified phone means no bearer token means no thread.
- Not in scope: photo/voice attachments, message deletion, translation,
  chat on resolved cases, and chat with trusted contacts (guardian-to-citizen).
