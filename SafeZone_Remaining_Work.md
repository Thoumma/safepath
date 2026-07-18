# SafeZone — Remaining Work / TODO

This document tracks what is **not finished** in SafeZone, checked against the
build plan, security log, UI redesign plan, and the auth + SQLite work. Items
are grouped by priority. Each item lists the affected files and a concrete
approach.

_Last reviewed: 2026-07-19_

---

## ✅ Already complete (for context)
- MVP build plan Steps 1–8 (crypto vault, GPS, SOS flow, Android + iOS permissions).
- Security log Steps 1–3, including the startup temp-file cleanup in `main.dart`.
- UI redesign (theme, status tile, SOS button, all screens).
- Auth + SQLite: setup/lock/OTP, real + fake (duress) password, decoy vault +
  silent alert, new-device OTP, PBKDF2 hashing, multiple trusted contacts.
- Passport OCR autofill (2026-07-16): picking/photographing the passport reads
  the MRZ on-device (ML Kit + `utils/mrz_parser.dart`, ICAO check digits) and
  offers to fill the profile — no retyping. Plaintext picker cache is wiped
  after encryption. `test/mrz_parser_test.dart` covers the parser.
- Ministry passport-API prep (2026-07-16): console `/settings` page stores the
  MOFA API key/URL + enable toggle (`system_settings` table, audit-logged).
  KYC review offers a "check with ministry" button when configured
  (`lib/passport-verify.ts` stub contract; `match` auto-verifies, `no_match`
  never auto-rejects); unconfigured/unreachable → manual KYC, unchanged.
- Live GPS tracking (2026-07-18): while an SOS case is open the app streams a
  fresh fix every 20s (foreground, `lib/services/live_tracking_service.dart`,
  2-hour cap) to a new authenticated `POST /api/me/case/track`, which appends a
  `CaseLocation` row and moves the case's latest lat/lng. The console case page
  shows a live "Tracking trail" + LIVE badge and auto-refreshes every 15s
  (`components/auto-refresh.tsx`); the app's Guardian tab shows a "ຕິດຕາມສົດ"
  indicator and live-polls while any guardian is in emergency. Duress-safe: the
  tracker refuses to start in decoy mode, `AuthService.lock()` stops it, and
  `_tick` re-checks the decoy/locked gate, so a coerced unlock streams nothing.
  Needs `npm run db:push` for the new `case_locations` table. Background (screen
  off / app killed) tracking is a separate follow-up — see P3 #12.
- Anti-trafficking reporting (2026-07-19): STOP-APP-style suspected-trafficking
  reports, anonymous by default. New Prisma `TraffikReport` (+ `ReportSource`/
  `ReportStatus` enums) and a public, unauthenticated `POST /api/report`
  (honeypot + length caps). Mobile: a 4th tab `ລາຍງານ` (`report_screen` +
  `report_form_screen`, `ReportService`, `TraffikReport`, `report_content.dart`)
  posting to the same endpoint (`source: MOBILE_APP`). Console: the whole staff
  dashboard moved behind `/admin` (route group `admin/(panel)/*`, login at
  `/admin/login`), middleware inverted to gate only `/admin`; the old analytics
  `/reports` became `/admin/analytics`; a new staff triage queue lives at
  `/admin/reports` with a NEW-count badge. Needs `npm run db:push` for the new
  `traffik_reports` table.
- Public website (2026-07-19): the console root is now a public site — `(public)`
  route group with Home (mission + "spot the signs" awareness), About, Contact,
  and a public Report form. Lao-first bilingual, reuses the console design
  system; `lib/trafficking-signs.ts` is the shared awareness taxonomy.
- Mobile UX polish (2026-07-19): first-run `welcome_screen` onboarding (teaches
  the app + the duress password) before setup; shared `SafeCard` widget; Lao
  label cleanup (no more stray "Trusted Contact"/"encrypted"); stronger duress
  explanation on setup + About; clearer contact empty state. Golden set
  (`design_preview_test`) regenerated to cover the copy changes + welcome/report.
- Console verified: `npm run build` passes clean (public + `/admin/*` routes, new
  `/api/report`), tsc + Prisma clean.
- `flutter analyze` clean; tests pass.
- Report photo evidence (2026-07-19, Phase 6b — was P3 #13): reporters can attach
  up to 3 evidence photos (web + app), stored **privately** (staff-only signed
  URLs). New `src/lib/report-storage.ts` (service-role client, auto-creates the
  private `report-photos` bucket, `uploadPhoto`/`signedUrl`, `photosEnabled()`
  fail-open gate) + `POST /api/report/photo` (multipart, jpeg/png/webp ≤5 MB,
  503 `photos_disabled` when unconfigured). `POST /api/report` now accepts/caps a
  `photoUrls[]` (≤3 opaque paths). Web `report-form.tsx` + mobile
  `report_form_screen.dart` add a picker (upload-on-select, thumbnails, remove);
  `/admin/reports` renders signed-URL thumbnails. **Fail-open:** no
  `SUPABASE_SERVICE_ROLE_KEY` → photo UI hidden, reports stay text-only; a failed
  upload is dropped with a toast, report still sends. No DB migration
  (`photoUrls` column pre-existed). **Setup:** add `SUPABASE_SERVICE_ROLE_KEY` to
  `safezone-console/.env.local` (documented in `.env.example`). Console tsc +
  `next build` clean; app `flutter analyze` + tests clean.
- Background live tracking (2026-07-19 — was P3 #12): live tracking now survives
  screen-off / backgrounding via geolocator's foreground service (**no new
  package**). `LiveTrackingService` keeps its 20s `Timer` poster and adds a
  best-effort `getPositionStream` (Android `ForegroundNotificationConfig`, iOS
  `allowBackgroundLocationUpdates`) that refreshes a cached fix `_tick` posts when
  fresh (≤45s), falling back to a one-shot read otherwise. **Duress-safe:**
  `start()` is decoy-gated so the stream + its notification can never originate
  under the fake password; `stop()` now cancels the subscription (tearing down the
  FGS + notification) and `lock()→stop()` guarantees it's gone before any fake
  unlock; `_tick` re-checks the gate. Background/Always permission is requested
  lazily inside `start()` (after the decoy gate), degrading to foreground-only if
  denied — any stream failure falls back to the old behaviour (no regression).
  Manifest gains `ACCESS_BACKGROUND_LOCATION`/`FOREGROUND_SERVICE`/
  `FOREGROUND_SERVICE_LOCATION`/`POST_NOTIFICATIONS`; Info.plist gains
  `NSLocationAlwaysAndWhenInUseUsageDescription` + `UIBackgroundModes=[location]`.
  New `test/live_tracking_test.dart` guards the duress-critical `stop()` teardown
  + cached-fix freshness. `flutter analyze` + tests clean. **Remaining:** on-device
  verification of background survival, the permission dialogs, and duress teardown
  (see the manual matrix — cannot be exercised without a physical device).

---

## P1 — Should fix soon (quality / security gaps)

### 1. Enforce the failed-attempt lockout on the lock screen ✅ done (2026-07-16)
From the 5th consecutive failure, `login()` returns `LoginResult.lockedOut`
for a cooldown that doubles per further failure (30s → 1m → … capped at 30
min). The check runs **before** any hash verification so real, fake (duress)
and wrong passwords are throttled identically — the lockout cannot be used as
an oracle to tell them apart. State is persisted in a new `auth_state` table
(DB v2) so a relaunch does not reset it. The lock screen replaces the submit
button with a live countdown. Covered by `test/auth_lockout_test.dart`,
including a simulated restart.

### 2. Remove or use `permission_handler` ✅ done (2026-07-16)
Removed from `pubspec.yaml` (zero Dart imports; `geolocator` handles location
permissions). `flutter pub get` + analyze + tests clean.

### 3. Update project docs to reflect auth + SQLite + multi-contact ✅ done (2026-07-16)
`CLAUDE.md` rewritten: repo now described as app + console, auth layer
(`DatabaseService` tables, `AuthService`/decoy/lockout, `DeviceIdentity`,
`OtpService` + composer limitation), the two-channel SOS flow with outbox, the
router auth gate, config/dart-defines, and the ffi + static-seam test
convention. The stale "main.dart lacks startup temp cleanup" drift note is
gone (it has the cleanup now). `safezone/README.md`: code inventory, run-lan
usage and scope note updated — backend is no longer "mock/roadmap".

### 4. Add OTP service unit tests ✅ done (2026-07-16)
`test/otp_service_test.dart` (5 tests): verifies once, single-use on reuse,
wrong code doesn't consume, 10-min expiry, regeneration invalidates the
previous code, and per-device isolation. Enabled by new seams:
`DeviceIdentity.testKeyOverride`, `OtpService.now`, and
`OtpService.deliveryEnabled` (skips url_launcher composers under
`flutter test`).

---

## P2 — Nice to have (UX)

### 5. Edit an existing contact + mark a primary contact
**Status:** contacts are add/delete only; editing means delete + re-add. No
"primary" concept (SOS/OTP currently use all, OTP order is list order).
- **Files:** `lib/screens/contact_screen.dart`, `lib/services/contact_store.dart`,
  `lib/models/trusted_contact.dart` (optional `isPrimary` / stable id).
- **Approach:** tap a contact row to edit in the same form; add an
  `updateAt(index, contact)` to the store. Optional: a primary flag used for
  ordering and labeling.

---

## P3 — Roadmap (needs a backend or larger effort; out of MVP scope)

### 6. Real automatic OTP + duress-alert delivery (backend)
**Why blocked:** silent/automatic SMS + email needs server-side secrets
(Twilio / SendGrid). iOS cannot send SMS silently at all. Today both the OTP and
the fake-password "silent" alert use the OS SMS/email **composer** (user taps
send), so the duress alert is **not truly invisible**.
- **Approach:** introduce an `OtpSender` / `AlertSender` interface with the
  current composer impl as default, and an `ApiSender` that calls our backend
  (Twilio + email). Keep the UI unchanged.

### 7. True cross-device accounts
**Why blocked:** with no backend, an account lives only in this install's SQLite.
"Unknown device" is approximated via a local device key. Real multi-device login
requires server-side account storage + sync.

### 8. Bind the passport AES key to the real password
**Status:** the AES key in secure storage is independent of the password, so the 
passport is technically decryptable without authenticating.
- **Approach:** derive a key-encryption-key from the real password (PBKDF2) and
  wrap the AES key with it. Careful: changing/forgetting the password must be
  handled to avoid permanent data loss; decide on a recovery story first.

### 9. SOS history / audit log
**Status:** not built (offered during planning, not selected).
- **Approach:** add a `sos_events` table (timestamp, lat/lng, maps URL, who was
  notified) and a History screen.

### 10. Passport image upload for console KYC
**Status:** the console's KYC review page (`/kyc/[id]`, added 2026-07-16) shows
the passport image from `Citizen.photoUrl`, but nothing populates that column —
the app deliberately never uploads the passport (device-only vault guarantee),
so the panel shows "no image" for everyone.
- **Decision needed first:** upload the vaulted passport at profile sync, or a
  separate explicit "submit for verification" capture in the app (keeps the
  vault guarantee intact; consent is explicit).
- **Approach:** private Supabase Storage bucket + short-lived signed URLs for
  staff; extend `/api/me/profile` (or a new endpoint) to accept the image and
  set `photoUrl`. Never make the bucket public.

### 11. Other vision items
Biometric unlock, embassy integration, web/cloud encrypted backup — per the
build plan §8, all remain roadmap.

### 12. Background live tracking (screen off / app killed) — ✅ built (2026-07-19)
**Done** — see the completion note in the "Already complete" section. Code +
`flutter analyze`/tests are clean; the remaining work is on-device verification
of background survival, permission dialogs, and duress teardown (manual matrix
below). Original design retained for reference:

**Status (original):** live tracking (2026-07-18) ran only while the app was open and
unlocked. When the phone is locked or backgrounded it stops, so a duty officer
following an open case loses fresh fixes the moment the user pockets the phone.
- **Why deferred:** needs a native Android **foreground service** + a persistent
  notification and background-location perms (and iOS background-location modes).
  The persistent notification is a **decoy-mode tell** — so it must stay off under
  duress.
- **Approach (no new package — `geolocator ^12` already installed):** in
  `LiveTrackingService`, best-effort subscribe to
  `Geolocator.getPositionStream(locationSettings: …)` with an Android
  `ForegroundNotificationConfig` (and iOS `AppleSettings.allowBackgroundLocationUpdates`)
  to keep the process alive; cache the latest fix and keep the existing 20s
  `Timer.periodic` posting it. Wrap the stream start in try/catch so any failure
  falls back to today's foreground-only behaviour (no regression). Reuse the
  existing duress gates (`start()` early-returns in decoy, `lock()` stops it,
  `_tick` re-checks) so the service + notification never appear under the fake
  password. End on case-resolve / "I'm safe" / the 2-hour cap.
- **Manifest/plist:** add `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_LOCATION` + declare `GeolocatorLocationService`
  (`foregroundServiceType="location"`) in `AndroidManifest.xml`; add
  `NSLocationAlwaysAndWhenInUseUsageDescription` + `UIBackgroundModes=[location]`
  in `ios/Runner/Info.plist`. Needs on-device verification.

### 13. Report photo evidence (Phase 6b) — ✅ built (2026-07-19)
**Done** — see the completion note in the "Already complete" section (console tsc
+ build clean, app analyze + tests clean). Needs `SUPABASE_SERVICE_ROLE_KEY` in
`safezone-console/.env.local` to enable; fail-open without it. Original design
retained for reference:

**Status (original):** trafficking reports were text + location only. STOP THE
TRAFFIK's app centres on photos; the `TraffikReport.photoUrls` column already
exists (added Phase 1), so **no DB migration** is needed.
- **Approach — private storage, staff-only signed URLs (STOP APP posture):**
  new `src/lib/report-storage.ts` builds a **service-role** Supabase client
  (`SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`), auto-creates a
  private `report-photos` bucket, and exposes `uploadPhoto` + `signedUrl`. New
  `POST /api/report/photo` (multipart, jpeg/png/webp ≤5 MB, returns `{path}`,
  503 `photos_disabled` when the key is absent) serves both web and app. The web
  `report-form.tsx` and the mobile `report_form_screen.dart` add an image picker
  (≤3, `image_picker` already installed), upload on select, and include the paths
  in the report POST (`TraffikReport.photoUrls`). The staff triage page
  (`/admin/reports`) renders `signedUrl` thumbnails.
- **Fail-open:** no service-role key → the photo UI is hidden and reports stay
  text-only; a failed photo upload is dropped with a snackbar, report still sends.
- **Setup:** add `SUPABASE_SERVICE_ROLE_KEY` to `safezone-console/.env.local`;
  the private bucket auto-creates on first upload.

---

## Multi-recipient delivery caveat (known limitation, not a bug)
One SMS composer addressed to several numbers (comma-joined) works on Android
but is unreliable for pre-filling multiple recipients on iOS. Acceptable for the
MVP's composer-based approach; resolved properly by item **#6** (backend).

---

## Suggested order
P1 is complete (#1–#4, 2026-07-16). #12 background tracking + #13 report photos
are built (2026-07-19); #12 still needs the on-device verification matrix, and
#13 needs `SUPABASE_SERVICE_ROLE_KEY` set to turn photos on. **Next session:**
#5 edit/primary contact → remaining P3 roadmap (#6–#11) as scope allows.
