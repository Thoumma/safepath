# SafeZone — Remaining Work / TODO

This document tracks what is **not finished** in SafeZone, checked against the
build plan, security log, UI redesign plan, and the auth + SQLite work. Items
are grouped by priority. Each item lists the affected files and a concrete
approach.

_Last reviewed: 2026-06-27_

---

## ✅ Already complete (for context)
- MVP build plan Steps 1–8 (crypto vault, GPS, SOS flow, Android + iOS permissions).
- Security log Steps 1–3, including the startup temp-file cleanup in `main.dart`.
- UI redesign (theme, status tile, SOS button, all screens).
- Auth + SQLite: setup/lock/OTP, real + fake (duress) password, decoy vault +
  silent alert, new-device OTP, PBKDF2 hashing, multiple trusted contacts.
- `flutter analyze` clean; 7/7 tests pass.

---

## P1 — Should fix soon (quality / security gaps)

### 1. Enforce the failed-attempt lockout on the lock screen
**Status:** counter exists but does nothing.
`AuthService._failedAttempts` is incremented and exposed via `failedAttempts`,
but no code throttles or blocks repeated guesses, so the lock screen currently
allows unlimited rapid password attempts.
- **Files:** `lib/services/auth_service.dart`, `lib/screens/lock_screen.dart`.
- **Approach:** after N failed attempts (e.g. 5), impose a cooldown (e.g. 30s,
  growing) during which `login()` returns a new `LoginResult.lockedOut` (or the
  lock screen disables the submit button and shows a countdown). Persist the
  attempt count + cooldown timestamp (secure storage or a small `auth_state`
  table) so it survives an app restart, otherwise an attacker just relaunches.
- **Test:** unit-test that the (N+1)th attempt within the window is rejected.

### 2. Remove or use `permission_handler`
**Status:** declared dependency, never imported in Dart.
`location_service.dart` uses `geolocator` only.
- **Files:** `pubspec.yaml` (and `lib/services/location_service.dart` if kept).
- **Approach:** simplest — delete `permission_handler` from `pubspec.yaml` and
  run `flutter pub get`. (Only keep it if we add camera/notification permission
  prompts that geolocator doesn't cover.)

### 3. Update project docs to reflect auth + SQLite + multi-contact
**Status:** stale. `README.md` still says "account/login = mock/roadmap" and
describes a single contact; `CLAUDE.md` predates the auth layer.
- **Files:** `README.md`, `CLAUDE.md`.
- **Approach:** document the new architecture — `DatabaseService` + tables,
  `AuthService`/`AuthMode`/decoy, `DeviceIdentity`, `OtpService`, the
  setup/lock/otp routes and router redirect gate, and the multi-contact store.
  Note the composer-based (non-silent) delivery limitation.

### 4. Add OTP service unit tests
**Status:** only `password_hasher` and DB schema are tested; OTP logic is not.
`OtpService.verify` (generate → verify, expiry, single-use, wrong code) is
untested because it reads the device key from secure storage.
- **Files:** `test/otp_service_test.dart` (new); possibly a small seam in
  `DeviceIdentity` to inject a fixed key in tests.
- **Approach:** with `sqflite_common_ffi` + an injectable device key, assert: a
  generated code verifies once, fails on reuse, and fails after expiry.

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

### 10. Other vision items
Biometric unlock, embassy integration, web/cloud encrypted backup — per the
build plan §8, all remain roadmap.

---

## Multi-recipient delivery caveat (known limitation, not a bug)
One SMS composer addressed to several numbers (comma-joined) works on Android
but is unreliable for pre-filling multiple recipients on iOS. Acceptable for the
MVP's composer-based approach; resolved properly by item **#6** (backend).

---

## Suggested order
1. #1 lockout throttle → 2. #3 docs → 3. #2 dead dependency → 4. #4 OTP tests
→ 5. #5 edit/primary contact → then P3 roadmap as scope allows.
