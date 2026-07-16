# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SafeZone helps Lao travellers abroad. Two apps in one repo:

- **`safezone/`** — the Flutter mobile app: encrypted passport vault, duress-aware login, and an SOS button that sends GPS over two independent channels (SMS to trusted contacts + the response console's server). UI strings are in **Lao**.
- **`safezone-console/`** — the Next.js 14 Response Console for duty officers (Prisma + Supabase Postgres, Supabase Auth, Tailwind/shadcn): SOS intake at `/api/sos`, inbox, cases, citizens, reports. See `safezone-console/README.md` for its own setup.

The repo root holds planning docs (`SafeZone_*.md`, `plan-*.md`, `.docx`). `SafeZone_Remaining_Work.md` is the live TODO list — update it when you finish one of its items.

## Commands

Flutter app — run all from inside `safezone/`:

```bash
cd safezone
flutter pub get      # install deps
flutter run          # run on connected device/emulator
.\run-lan.ps1        # run with the console + Supabase wired up for LAN testing (reads safezone-console/.env.local)
flutter analyze      # lint / static analysis (flutter_lints, see analysis_options.yaml)
flutter test                              # run all tests
flutter test test/auth_lockout_test.dart  # run a single test file
```

Console — run all from inside `safezone-console/` (needs `.env.local`, see its README): `npm run dev`, `npm run db:push`, `npm run db:seed`, `npm run lint`.

If platform folders are ever regenerated (`flutter create .`), permissions must be re-added by hand or the app crashes at runtime — Android `INTERNET`/`CAMERA`/`ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` in `AndroidManifest.xml`, and iOS `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`/`NSLocationWhenInUseUsageDescription` in `Info.plist`. See `safezone/README.md` for the exact snippets. `applicationId` is `com.example.safezone`.

## Architecture (Flutter app)

Three layers under `safezone/lib/`:

- **Screens** (`screens/`) — an auth gate (`SetupScreen`, `LockScreen`, `OtpScreen`), three bottom-bar tabs (`HomeScreen`, `GuardianScreen`, `AboutScreen` inside `widgets/app_shell.dart`), and full-screen drill-downs (`PassportScreen`, `ContactScreen`, `ProfileScreen`, `SosScreen`). Wired via `go_router` in `router.dart`; `/sos` and the auth routes deliberately render over the shell so they cannot be escaped via a tab.
- **Services** (`services/`) — all are private-constructor **singletons** accessed via `.instance` (e.g. `CryptoService.instance`). This is the de facto state layer; there is no provider/bloc graph despite `provider` being a dependency.
- **Models** (`models/`) — plain data classes with `toJson`/`fromJson` (e.g. `TrustedContact`, `AppUser`, `PendingSos`).

Screens hold their own local widget state and re-query services in `initState`/on return from navigation, rather than subscribing to a shared store. The one exception: `AuthService` is a `ChangeNotifier` used as `GoRouter.refreshListenable`, so auth changes re-run the router redirect (no account → `/setup`; locked → `/lock`; unlocked → app).

### Auth layer (SQLite)

`DatabaseService` opens `safezone.db` (v2) with tables `app_user` (PBKDF2 hashes of the real **and** fake password — see `utils/password_hasher.dart`), `known_devices`, `otp_codes`, and `auth_state` (login-throttle state). On top of it:

- **`AuthService`** — setup/login/lock. The **fake (duress) password** opens an empty decoy vault and silently fires `triggerSos(duress: true)`; the console raises that case to CRITICAL. Failed logins throttle from the 5th consecutive failure (30s cooldown, doubling, capped at 30 min, persisted across relaunch) — the check runs *before* hash verification so the lockout can't be used as an oracle to tell real/fake/wrong apart.
- **`DeviceIdentity`** — random device key in secure storage; a real-password login on an unknown device requires an OTP (`OtpService`, 6-digit, PBKDF2-hashed, 10-min TTL, single-use) approved by a trusted contact.
- Delivery limitation: OTP and duress alerts go out via the OS SMS/email **composer** (user taps send) — there is no backend sender, so the duress alert is not truly invisible. Tracked as item #6 in `SafeZone_Remaining_Work.md`.

### The SOS flow (core feature)

`SosService.triggerSos()` sends GPS over **two independent channels that cannot abort each other**: the console server (`SosServer` → `POST /api/sos`, falls back to a Supabase insert) and an SMS composer to all trusted contacts. A transient server failure is queued in `SosOutbox` and flushed on next launch — a queued alert is reported as "queued", not success or failure. It throws `SosException` (Lao message) only when there is nothing to send (no GPS) or nowhere to send it. `SosDispatch` reports per-channel results; "SMS launched" means the composer *opened*, never that it was sent — the UI must not claim more.

**The passport is deliberately not part of the SOS flow.** Sharing it is a separate, manual action on the Passport screen.

Console/Supabase endpoints come from `lib/config/` (`--dart-define=CONSOLE_URL/SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY`; `run-lan.ps1` sets these). Unconfigured channels report `notConfigured` — the app must still boot and SOS must still work over SMS with zero connectivity.

### Security model — read before touching crypto, auth, or passport handling

The central guarantee is: **the passport plaintext only lives in memory (or in a short-lived temp file during an active share); it is never persisted in plaintext.**

- `CryptoService` does AES-256-CBC. The 256-bit key is generated once with `Key.fromSecureRandom(32)` and stored in the OS secure keystore via `flutter_secure_storage` — never hard-coded, never written to normal storage. Encrypted blob layout is `IV (16 bytes) || ciphertext`.
- `PassportStore` writes only the encrypted `passport.enc` to the app documents dir. `exportDecryptedTemp()` writes a transient `passport_share.jpg` to the temp dir for the share sheet, and `clearTempFiles()` deletes it — called in a `finally` around every share *and* proactively in `main.dart` on startup (crash recovery).
- `ContactStore` keeps the trusted-contact list (PII) in secure storage, not SQLite; passwords and OTP codes are stored only as salted PBKDF2 hashes.
- The Supabase publishable key shipped in the APK is public by design; `sos_events` is write-only under RLS. Never put a secret key in the app.

## Conventions

- User-facing strings are Lao; keep new UI text and error messages in Lao to match.
- Add new cross-screen state as a `.instance` singleton service to match the existing pattern.
- Phone numbers are E.164 (e.g. `+85620…`).
- Tests run against real SQLite via `sqflite_common_ffi` with static test seams instead of mocks (`DatabaseService.testPathOverride`, `AuthService.now`, `OtpService.now`/`deliveryEnabled`, `DeviceIdentity.testKeyOverride`) — follow that pattern (see `test/auth_lockout_test.dart`, `test/otp_service_test.dart`), and reset seams in `tearDown`.
