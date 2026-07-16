# SafeZone — Remaining Work / TODO

This document tracks what is **not finished** in SafeZone, checked against the
build plan, security log, UI redesign plan, and the auth + SQLite work. Items
are grouped by priority. Each item lists the affected files and a concrete
approach.

_Last reviewed: 2026-07-16_

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
P1 is complete (#1–#4, 2026-07-16). Next: #5 edit/primary contact → then P3
roadmap as scope allows.
