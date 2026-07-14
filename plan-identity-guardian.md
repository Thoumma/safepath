# Plan: Citizen identity, the app→console loop, and the Guardian tab

**Status:** **implemented (2026-07-14)** — Phases A, B and C are code-complete. `flutter analyze`
clean, 32/32 tests pass, console `tsc --noEmit` clean. Phase D verification is **partly blocked on
§9**: the loop cannot be driven end-to-end until the console is deployed and Supabase Phone Auth is
switched on. Both are config steps only you can do.

**Supersedes nothing.** `plan.md` (SOS simplification) and `plan-theme-port.md` are both done;
this builds on top of them.

### Deviation from plan: the Home layout had to be fixed

Adding the bottom bar exposed a **pre-existing** bug rather than causing one. Home pinned SOS to
the bottom with the dashboard in an `Expanded` scroll above it, and `SosButton` reserved a
`SizedBox` of `buttonSize * 1.8` (324pt) for a pulse that only ever scales to 1.5× (270pt) — 54pt
of space nothing painted into. Header + SOS block together left the dashboard **~48pt of viewport**,
so the status card was sliced through its first row and everything below it was unreachable. The
nav bar turned "bad" into "unusable".

Fixed by: tightening the pulse reserve to exactly 1.5×; moving SOS to be the hero directly under
the header (always above the fold, which is the only property that actually matters) with the
dashboard scrolling beneath; and deleting the two "quick action" tiles, which were duplicate routes
to `/passport` and `/contact` — the `StatusTile` rows above them already navigate to exactly those
two screens. Verified in `test/goldens/home_shell_{light,dark}.png`, which render Home inside the
real nav-bar chrome.

---

## 0. Why these are one piece of work, not three

The three asks — *close the app→console loop*, *add a bottom bar*, *show me who lists me as
their trusted contact* — look independent. They are not. They all block on the same missing thing.

**The app has no idea who its user is.** `SetupScreen` collects three passwords. `AppUser` is
four hashes and a timestamp. `DeviceIdentity` is a random opaque key. There is no name, no phone
number, no passport number anywhere in `safezone/lib/`.

That single gap explains both features:

- **The loop is broken** not merely because nobody calls `POST /api/sos`, but because the app
  cannot satisfy it. That endpoint **400s without `passportNo`** (`api/sos/route.ts:32`) and
  upserts a `Citizen` keyed by it. The app sends an opaque `device_id` to `sos_events`. The two
  systems key on different identities and never meet. A duty officer at 2am cannot help a UUID.
- **The Guardian screen** is the query *"which citizens list **my phone number** in
  `trusted_contacts`?"* — which requires the app to know, and be able to prove, its own number.

The console schema already models all of this: `Citizen(fullName, passportNo, phone)` and
`TrustedContact(citizenId, name, phone, isPrimary)`. **The tables were designed for this and were
simply never populated.** And because `DATABASE_URL` is the Supabase pooler, Prisma and Supabase
are one Postgres — there is no data to bridge, only to write.

So: **one foundation (a Citizen identity), two features fall out of it.**

---

## 1. Decisions taken

| Decision | Choice | Consequence |
| --- | --- | --- |
| Bottom bar | **Home / Guardian / About** (3 tabs) | Home is a tab, so SOS is always one visible tap away. A 2-tab bar with no Home was rejected as broken navigation. |
| Phone trust | **Supabase Phone Auth (real SMS OTP)** | Costs a Twilio account + config (§9, blocking). Buys a genuinely secure reverse-lookup, and also unblocks roadmap #6 (real OTP delivery) and #7 (cross-device accounts). |
| SOS → console | **App POSTs to the console's `/api/sos`** | Reuses the citizen-upsert + ref-number + timeline logic already written. **Requires the console to be publicly deployed** — a phone cannot reach `localhost:3000`. See §9. |

### 1a. The one thing the phone-auth choice fixes for free

`/api/sos` currently guards itself with `SOS_INGEST_TOKEN`, a shared bearer token
(`api/sos/route.ts:14-17`). **A bearer token compiled into a shipped mobile app is not a secret** —
anyone can extract it from the APK and forge cases into the embassy's inbox.

Because we now have a real phone-verified JWT, `/api/sos` must instead **verify the Supabase access
token** and derive the citizen from its `phone` claim. The case then provably belongs to a real,
phone-verified human. `SOS_INGEST_TOKEN` is retired.

---

## 2. Foundation — Profile + phone verification

### 2a. Offline-first is non-negotiable

**Phone verification must be optional and deferrable, and must never gate setup.**

SafeZone is used by travellers abroad — roaming, on a dead SIM, on hostile wifi. If account
creation required an SMS round-trip, a user with no connectivity could not create an account *at
all*, in the exact scenario the app exists for. That would be a worse bug than the one we're fixing.

Therefore:

- **`SetupScreen` stays passwords-only and stays fully offline.** Unchanged.
- The app **works completely without a profile**: SOS still fires, and the SMS channel — the one
  that needs no internet — still reaches the trusted contact. This is the guarantee.
- A profile only **adds** capability: the server channel, a real case in the console, and the
  Guardian tab.
- The profile is prompted, never forced: a dismissible card on Home
  (`ຕື່ມຂໍ້ມູນຂອງທ່ານ ເພື່ອໃຫ້ສະຖານທູດຊ່ວຍທ່ານໄດ້`), and as the empty state of the Guardian tab.

### 2b. `models/user_profile.dart` + `services/profile_store.dart`

```dart
class UserProfile {
  final String fullName;
  final String passportNo;
  final String phone;        // E.164, +85620…
  final bool phoneVerified;  // true only after a real Supabase OTP round-trip
}
```

Stored in `flutter_secure_storage`, **not** SQLite — a passport number and phone are PII, and this
matches the existing `ContactStore` precedent (plaintext SQLite is for hashes and device keys only).

### 2c. `services/phone_identity.dart` — Supabase Phone Auth

```dart
Future<void> sendCode(String phone);              // supabase.auth.signInWithOtp(phone: …)
Future<bool> verifyCode(String phone, String code); // …verifyOtp(type: OtpType.sms)
String? get verifiedPhone;                        // from the session JWT's `phone` claim
Session? get session;                             // the access token /api/* will verify
```

**This is distinct from the existing `OtpService`, and both stay.** They solve different problems
and must not be merged:

- `OtpService` (local) — *"is this a device I trust?"* Sends a code **to your trusted contacts**
  via the OS composer to approve a new-device login.
- `PhoneIdentity` (Supabase) — *"do you own this number?"* Sends a code **to you** to prove it.

A code you send to yourself via a composer you can already read proves nothing, which is exactly
why the reverse-lookup could not be made safe on the existing OTP alone.

---

## 3. Close the loop — SOS reaches the console inbox

### 3a. Rewrite the server channel (`services/sos_server.dart`)

`sendLocation()` swaps its Supabase `sos_events` insert for an authenticated
`POST {CONSOLE_URL}/api/sos`, carrying the profile the endpoint has always demanded:

```
Authorization: Bearer <supabase access token>
{ passportNo, fullName, phone, lat, lng, mapsUrl, type: "SOS", duress: false }
```

Everything else about this file is **preserved as-is** — it is already correct and hard-won:

- It never throws. An emergency must not abort because the network is down.
- `SocketException` / `TimeoutException` / `ClientException` → `skippedOffline`. That
  `ClientException` case in particular is what "no signal abroad" actually looks like on Android;
  do not lose it.
- 8-second timeout.

Add one enum case: **`ServerStatus.noProfile`** → `'ຍັງບໍ່ໄດ້ຕື່ມຂໍ້ມູນຂອງທ່ານ'`. Reusing
`notConfigured` here would lie to the user about *why* nothing reached the server, and §3 of
`plan.md` exists precisely to stop the SOS screen lying about what went out.

`sos_events` and the Supabase client **stay** — that table remains the raw location stream for
Phase-2 live tracking (`type: 'live'`), which must *not* mint a new case per point.

### 3b. `/api/sos` (console)

- Verify the Supabase JWT; derive `phone` from the claim. Reject unauthenticated. Retire
  `SOS_INGEST_TOKEN`.
- Accept `duress: bool`. When true → `severity: CRITICAL`, `type: "DURESS"`, and a timeline event
  saying the user entered their duress password. **The duty officer needs to know they were
  coerced.** (See §7 — this is server-side only; nothing on the device may change.)
- Keep the existing citizen-upsert, `SOS-YYYY-MMDD-NNN` ref number, and timeline event.

### 3c. New console endpoints

All authenticated by the same Supabase JWT via one shared `requireAppUser(req)` helper.

| Endpoint | Purpose |
| --- | --- |
| `PUT /api/me/profile` | Upsert the caller's `Citizen` from the app's profile. |
| `PUT /api/me/contacts` | Replace the caller's `trusted_contacts` set (§4). |
| `GET /api/me/guardians` | The reverse lookup (§5). |

---

## 4. Sync trusted contacts upward

Contacts live in device secure storage and are the app's most private data. They must now also
exist server-side, because the reverse-lookup is a server-side join.

- On add/remove in `ContactScreen`, and on next successful connection, `PUT /api/me/contacts`
  replaces the caller's set (whole-set replace — simpler and idempotent; a partial sync of an
  emergency contact list is worse than a late one).
- Requires a verified profile. No profile → no sync, silently. The local list keeps working; SMS
  is unaffected.
- Offline → queue and flush on next success. Never block the UI.

---

## 5. The Guardian tab — `screens/guardian_screen.dart`

**What it is:** *"These people made you their emergency contact."*

A passive list would be nearly worthless. The value is that **it closes the human loop the way the
console closes the institutional one.** Today, if Somchai lists me and presses SOS, I get an SMS —
and the app that arranged the whole relationship shows me nothing.

`GET /api/me/guardians` returns, for each citizen whose `trusted_contacts` contains my verified
phone:

- name, relation, phone
- **status**: `ປອດໄພ` (no open case) or `ສຸກເສີນ` (an open `NEW`/`ACK`/`IN_PROGRESS` case)
- if in emergency: time, last known location, tappable Google Maps link, and a **[ໂທຫາ]** call button

Empty state: `ຍັງບໍ່ມີໃຜເພີ່ມທ່ານເປັນຜູ້ໄວ້ໃຈ`.
No verified phone yet: a prompt to verify (§2), not an error.
Pull-to-refresh. (Supabase realtime on this list is a later nicety, not Phase 1.)

---

## 6. Navigation — the bottom bar

`StatefulShellRoute.indexedStack` with three branches:

| Route | Label (Lao) | Icon |
| --- | --- | --- |
| `/` | `ໜ້າຫຼັກ` | home |
| `/guardian` | `ຜູ້ໄວ້ໃຈ` | shield |
| `/about` | `ກ່ຽວກັບ` | info |

**Routes deliberately kept OUT of the shell** (full-screen, no bottom bar):

- `/sos` — nobody tabs away mid-emergency-confirm. The confirm gate stays absolute.
- `/setup`, `/lock`, `/otp` — the auth gate must not be escapable via a tab.
- `/passport`, `/contact`, `/profile` — drill-downs from Home, reached with a back affordance.

In `go_router`, top-level routes declared as siblings of the shell render over it. That is the
mechanism.

**The SOS button must not lose its dominance.** The bar costs ~56dp plus the safe-area inset. Keep
≥24dp of clearance between the SOS circle and the bar — the failure mode to design against is a
panicked thumb reaching for SOS and catching a tab instead.

`/about`: a plain static screen (what SafeZone is, who built it, the emergency numbers, a version
string). Cheap, and it's what a judge or a first-time user opens first.

---

## 7. Duress — the hard security constraint

**Read this before writing the Guardian screen or the profile screen.**

`AuthService.isDecoy` is true when the app was unlocked with the **fake password** under coercion.
In that state the vault shows a decoy and a silent alert has already fired.

If the Guardian tab or the Profile screen renders real data in decoy mode, then an attacker who
forces the decoy password out of the user learns their **real name, passport number, phone number,
and the complete list of everyone who depends on them — including those people's live locations.**
That defeats the decoy vault entirely. The decoy would be protecting a passport photo while leaking
the user's whole social graph.

Hard requirements:

1. `GuardianService.load()` returns `[]` immediately when `AuthService.instance.isDecoy` — it must
   **not even hit the network**.
2. The Profile screen shows nothing and reveals no real passport number in decoy mode.
3. The Home "complete your profile" card is **hidden** in decoy mode — its presence would imply a
   real profile exists elsewhere.
4. **The decoy empty states must be byte-identical to genuine empty states.** No "hidden",
   no "locked", no lock icon. Any wording that differs is a tell, and a tell is the whole
   vulnerability.
5. **The duress silent SOS still goes out**, and still POSTs with `duress: true`. The Supabase
   session is deliberately *kept* in decoy mode so this can happen. The protection is at the UI and
   service layer, not by dropping the session — dropping it would silence the duress alert, which
   is the one thing that must survive.

---

## 8. Task list (ordered — later tasks depend on earlier ones)

**Phase A — foundation + close the loop** *(works without Twilio; unverified phone)*
1. `UserProfile` model + `ProfileStore` (secure storage).
2. `ProfileScreen` (name / passport no / phone) + the dismissible Home prompt card.
3. Console: `requireAppUser()` helper; `PUT /api/me/profile`.
4. Console: rework `/api/sos` — JWT auth, `duress` flag, retire `SOS_INGEST_TOKEN`.
5. App: `SosServer.sendLocation()` → `POST /api/sos`; add `ServerStatus.noProfile`.
6. **Verify end-to-end: press SOS on the phone → a case appears in the console inbox.** ← the loop.

**Phase B — navigation** *(independent of the backend; ship early, it's visible)*
7. `StatefulShellRoute` + bottom bar; keep `/sos`, `/lock`, `/setup`, `/otp` out of the shell.
8. `AboutScreen`.
9. Check the SOS button still dominates Home with the bar present (golden test, both themes).

**Phase C — phone verification + Guardian** *(blocked on §9)*
10. `PhoneIdentity` (Supabase Phone Auth: `signInWithOtp` / `verifyOtp`).
11. Wire verification into `ProfileScreen`; set `phoneVerified`.
12. Contact sync: `PUT /api/me/contacts` on change + offline queue.
13. Console: `GET /api/me/guardians` (reverse lookup + open-case status).
14. `GuardianScreen` + `GuardianService`, **with the §7 decoy gate written first, not bolted on.**

**Phase D — verification**
15. `flutter analyze` clean; `flutter test` passes; goldens re-rendered in both themes.
16. **Decoy drill:** unlock with the fake password and confirm the Guardian tab and Profile leak
    nothing, and that the empty state is indistinguishable from a genuine one.
17. Offline drill: airplane mode → SOS still opens the SMS composer; server row reports
    `skippedOffline`; nothing throws.

---

## 9. Blocking prerequisites — **these are yours, not mine**

Two things I cannot do from here, and Phase A/C do not fully work until they're done:

1. **Deploy the console publicly** (Vercel or similar) and put its URL in the app's config. A phone
   cannot reach `localhost:3000`. This is the direct cost of choosing `POST /api/sos` over a DB
   trigger. Until then, the loop can only be tested with the phone and console on the same LAN via
   the machine's IP.
2. **Enable Phone Auth in the Supabase dashboard** (Authentication → Providers → Phone) and connect
   a Twilio account (Account SID, Auth Token, Message Service SID). Note: **a Twilio *trial*
   account can only send SMS to numbers you have verified with Twilio** — fine for a demo, but know
   it before demoing to a stranger's phone.

Everything in Phase C will be built behind these so it works the moment they're switched on.

---

## 10. Risks

- **Contact sync uploads the social graph.** Trusted contacts are currently device-only, which is a
  real privacy property we are giving up in exchange for the Guardian feature. The mitigation is
  RLS plus a verified-phone claim, and §7. It is a deliberate trade, and it should be stated
  plainly in the README rather than buried.
- **Phase C is worthless if the phone is unverified.** Do not ship the Guardian tab reading a
  self-declared number — that is the social-graph leak we explicitly rejected. If Twilio slips,
  ship Phases A and B and hold the tab behind the verification prompt.
- Passport number is now typed by hand into a profile. It is stored in secure storage, but it does
  leave the device to the console (which is the point — the embassy needs it).

## 11. Out of scope

- `CryptoService`, `PassportStore`, the encryption model. Untouched.
- Phase-2 live tracking (`plan.md` §6).
- The open P1 items in `SafeZone_Remaining_Work.md` — lockout throttle, dead `permission_handler`,
  stale docs, OTP tests. Still open; **the lockout throttle in particular should be done before any
  of this ships**, since a profile now makes an unlocked app more valuable to an attacker.
