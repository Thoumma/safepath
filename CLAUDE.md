# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SafeZone is a Flutter MVP for Lao travellers abroad: an encrypted passport vault plus an SOS button that sends the user's GPS location and a copy of their passport to a pre-set Trusted Contact. UI strings are in **Lao**. Backend/embassy integration is out of scope (mock/roadmap) — the demo focuses on one flow: scan passport → set contact → press SOS.

The Flutter project lives in the `safezone/` subdirectory. The repo root holds planning docs (`SafeZone_*.md`, `.docx`).

## Commands

Run all from inside `safezone/`:

```bash
cd safezone
flutter create .     # FIRST TIME ONLY — generates platform folders (android/, ios/, …); does NOT overwrite lib/
flutter pub get      # install deps
flutter run          # run on connected device/emulator
flutter analyze      # lint / static analysis (flutter_lints, see analysis_options.yaml)
flutter test                              # run all tests
flutter test test/widget_test.dart        # run a single test file
```

After the first `flutter create .`, platform permissions must be added by hand or the app crashes at runtime — Android `INTERNET`/`CAMERA`/`ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` in `AndroidManifest.xml`, and iOS `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`/`NSLocationWhenInUseUsageDescription` in `Info.plist`. See `safezone/README.md` for the exact snippets. Some plugins need Android `minSdkVersion` 21+.

## Architecture

Three layers under `safezone/lib/`:

- **Screens** (`screens/`) — `HomeScreen` (dashboard), `PassportScreen`, `ContactScreen`, `SosScreen`. Wired via `go_router` in `router.dart` (`/`, `/passport`, `/contact`, `/sos`). `MaterialApp.router` is set up in `main.dart`; theme in `theme.dart`.
- **Services** (`services/`) — all are private-constructor **singletons** accessed via `.instance` (e.g. `CryptoService.instance`). This is the de facto state layer; there is no provider/bloc graph despite `provider` being a dependency.
- **Models** (`models/`) — plain data classes with `toJson`/`fromJson` (e.g. `TrustedContact`).

Screens hold their own local widget state and re-query services in `initState`/on return from navigation (see `HomeScreen._refresh`), rather than subscribing to a shared store.

### The SOS flow (core feature)

`SosService.triggerSos()` orchestrates everything and is the heart of the app: load Trusted Contact → get GPS (`LocationService`) → decrypt passport to a temp file (`PassportStore.exportDecryptedTemp`) → launch an SMS draft with a Google Maps URL (`url_launcher`) → share the passport image via the OS share sheet (`share_plus`) → delete the temp file in a `finally`. Failures at each step throw `SosException` with a Lao-language message.

### Security model — read before touching crypto or passport handling

The central guarantee is: **the passport plaintext only lives in memory (or in a short-lived temp file during an active share); it is never persisted in plaintext.**

- `CryptoService` does AES-256-CBC. The 256-bit key is generated once with `Key.fromSecureRandom(32)` and stored in the OS secure keystore via `flutter_secure_storage` — never hard-coded, never written to normal storage. Encrypted blob layout is `IV (16 bytes) || ciphertext`.
- `PassportStore` writes only the encrypted `passport.enc` to the app documents dir. `exportDecryptedTemp()` writes a transient `passport_share.jpg` to the temp dir for the share sheet, and `clearTempFiles()` deletes it. The SOS flow always calls `clearTempFiles()` in a `finally`.
- `ContactStore` keeps the Trusted Contact JSON in secure storage too.

`SafeZone_Security_Improvements.md` documents this hardening. Note one drift: that doc's "Step 3" describes a proactive temp-file cleanup sweep in `main.dart` on startup, but the current `main.dart` does not implement it — only the `finally`-based cleanup in `SosService` is present. Verify against the code, not the doc.

## Conventions

- User-facing strings are Lao; keep new UI text and error messages in Lao to match.
- Add new cross-screen state as a `.instance` singleton service to match the existing pattern.
- Phone numbers are E.164 (e.g. `+85620…`).
