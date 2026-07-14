# Plan: Simplify the SOS flow to "confirm → send GPS location"

**Status:** plan only — no code written yet. For Claude Code to implement.
**Owner intent (Thoum):** make the app simple, fast, and easy to use. The whole job of SOS
is to deliver the user's location to help *fast*. Manual approval every time. Do not send
continuous SMS. Passport is not part of SOS.

Previous theme-port plan moved to `plan-theme-port.md` (unrelated, still valid).

**Update (2026-07-14):** Phase 1 below is **implemented**. The follow-on work — giving the app a
Citizen identity, closing the app→console loop, the bottom bar, and the Guardian tab — is planned
in `plan-identity-guardian.md`. Note it revises §2a: the server channel now POSTs to the console's
`/api/sos` rather than inserting into Supabase `sos_events` directly (that table survives for the
Phase-2 live stream in §6).

---

## 1. Goal

Reduce SOS to a single, reliable action:

> Press SOS → confirm screen (manual approve) → app sends the user's **GPS location** to help,
> through **two channels at once**: Trusted Contact (SMS) and VFI/server. Show a clear
> per-channel status. Works even with no internet.

What changes from today:

- **Remove the passport from the SOS flow.** Today `SosService.triggerSos()` decrypts the
  passport and opens the OS share sheet (`sos_service.dart:40-63`). Drop that. Passport becomes
  a separate, manual action on the Passport screen (§4).
- **Add a second channel: VFI/server** — a *stub* for now (no backend yet, per `CLAUDE.md`).
  Structure it so a real endpoint drops in later. SMS stays the real, working path.
- **Make channels independent.** One channel failing must not abort the other. Only throw when
  there is no destination at all or GPS can't be read.
- **Offline-safe.** SMS + GPS need no internet. The server channel is tried only when reachable;
  if offline it is cleanly skipped, SMS still goes.
- **No continuous/repeated SMS.** Send once, on confirm. (If live tracking is ever wanted, it
  goes over the server channel on data — never SMS.)

Keep all UI strings in **Lao**, matching existing convention.

---

## 2. Service layer

### 2a. New: `services/sos_server.dart` (real — Supabase)

The backend is **Supabase** (already in the stack — the Response Console reads from it). The app
*writes* location events; the console reads them. So this is a real channel, not a stub.

```dart
enum ServerStatus { sent, failed, skippedOffline, notConfigured }

class SosServer {
  SosServer._();
  static final SosServer instance = SosServer._();

  Future<ServerStatus> sendLocation({
    required double lat,
    required double lng,
    required String mapsUrl,
    String type = 'sos', // 'sos' (one-shot) | 'live' (tracking point)
  }) async {
    // Supabase not initialised / no config -> notConfigured (stays stable).
    try {
      await Supabase.instance.client.from('sos_events').insert({
        'device_id': DeviceIdentity.instance.id, // existing service
        'lat': lat, 'lng': lng, 'maps_url': mapsUrl,
        'type': type, 'created_at': DateTime.now().toUtc().toIso8601String(),
      }).timeout(const Duration(seconds: 8));
      return ServerStatus.sent;
    } on SocketException {
      return ServerStatus.skippedOffline;   // offline — SMS still covers it
    } on TimeoutException {
      return ServerStatus.skippedOffline;
    } catch (_) {
      return ServerStatus.failed;
    }
  }
}
```

Setup:
- Add `supabase_flutter` to `pubspec.yaml`.
- Initialise in `main.dart`: `await Supabase.initialize(url: ..., anonKey: ...)`. Keep the URL +
  anon key in one `SupabaseConfig` file (or `--dart-define`), not scattered.
- **Table `sos_events`**: `id` (uuid, default), `device_id` (text), `lat` (float8), `lng`
  (float8), `maps_url` (text), `type` (text), `created_at` (timestamptz). Add an RLS insert
  policy for the anon key (write-only from the app); the console reads with its own role.
- `type` distinguishes a one-shot SOS point from a Phase-2 live-tracking point.

### 2b. Rewrite `services/sos_service.dart`

Replace the passport/share logic with a two-channel dispatch that never fails halfway.

```dart
class SosDispatch {
  final String? contactNames;   // null if no contact configured
  final String mapsUrl;
  final bool smsLaunched;       // SMS composer opened
  final ServerStatus serverStatus;
  SosDispatch({this.contactNames, required this.mapsUrl,
               required this.smsLaunched, required this.serverStatus});
}
```

`triggerSos()` new sequence:

1. Get GPS (`LocationService`). If `position == null` → throw `SosException(loc.error ?? ...)`.
   (GPS is the one hard requirement — with no location there is nothing to send.)
2. Compute `mapsUrl`.
3. **Server channel** (independent, awaited but never throws): `SosServer.instance.sendLocation(...)`.
4. **SMS channel** (independent): load contacts. If any exist, build the composer URI (keep the
   current Lao body, `mapsUrl` only — no passport text) and `launchUrl`; set `smsLaunched`.
   If no contacts, `smsLaunched = false`, `contactNames = null`.
5. If **both** channels are dead ends (no contact **and** `serverStatus == notConfigured`),
   throw `SosException('ຍັງບໍ່ໄດ້ຕັ້ງຜູ້ຊ່ວຍເຫຼືອ ຫຼື ເຊີບເວີ.')` so the user knows nothing went out.
6. Return `SosDispatch(...)`.

Remove all `PassportStore` / `Share` imports and usage from this file. Delete `SosResult`
(replaced by `SosDispatch`). No `clearTempFiles()` here anymore.

---

## 3. SOS screen (`screens/sos_screen.dart`)

- **Confirm dialog** (`sos_screen.dart:37-43`): remove the passport wording. New content string:
  `'ແອັບຈະສົ່ງຕຳແໜ່ງ GPS ຂອງທ່ານໄປຫາຜູ້ຊ່ວຍເຫຼືອ.'`
  Title and buttons (`ຍົກເລີກ` / `ສົ່ງ SOS`) stay. This is the manual-approve gate — keep it.
- **Success view** (`sos_screen.dart:140-230`): replace the single "sent to contact" line with a
  small **two-row status list**, one row per channel, each with ✅ / ❌ / "—" and a Lao label:
  - SMS row: `smsLaunched` → `'ສົ່ງ SMS ຫາ ${contactNames}'` ✅; if no contact →
    `'ບໍ່ໄດ້ຕັ້ງ Trusted Contact'` (muted, not an error).
  - Server row: map `ServerStatus` → Lao:
    `sent`=`'ສົ່ງຫາເຊີບເວີ VFI ແລ້ວ'` ✅ · `skippedOffline`=`'ບໍ່ມີເນັດ — ຂ້າມເຊີບເວີ'` ⚠ ·
    `failed`=`'ສົ່ງຫາເຊີບເວີບໍ່ສຳເລັດ'` ❌ · `notConfigured`=`'ຍັງບໍ່ເປີດໃຊ້ເຊີບເວີ'` (muted).
  - Keep the tappable Google Maps URL block (`sos_screen.dart:189-226`) unchanged.
- Update the `_result` field type from `SosResult?` to `SosDispatch?`.
- Leave the `Color(0xFFFDF2F2)` hardcode (`sos_screen.dart:240`) as-is here; it's owned by the
  theme-port plan, not this task.

Home screen SOS button already routes to `/sos` (`home_screen.dart:240-242`) which shows the
confirm dialog — that satisfies "manual approve every time." No change needed there.

---

## 4. Passport becomes a separate manual action

Move the decrypt→share→clear logic out of SOS into the **Passport screen** as an explicit button,
so the capability is preserved but never automatic.

- Add a button on `screens/passport_screen.dart`, e.g. `'ສົ່ງສຳເນົາພາສປອດ'`, shown only when a
  passport exists.
- On tap: its **own** confirm dialog (`'ສົ່ງສຳເນົາພາສປອດຂອງທ່ານອອກໄປບໍ?'`), then
  `PassportStore.exportDecryptedTemp()` → `Share.shareXFiles([...])` → `clearTempFiles()` in a
  `finally`. This keeps the security guarantee (temp file deleted after share).
- Keep the existing encrypt/decrypt/vault behaviour otherwise untouched.

**Do not touch** `CryptoService`, `PassportStore` internals, or the crypto/security model — only
move *where* the share is triggered from.

---

## 5. Verification

1. `cd safezone && flutter pub get && flutter analyze` — clean.
2. `flutter test` — update/replace any test that referenced `SosResult` or the old passport-in-SOS
   flow (`test/widget_test.dart`).
3. Manual drive of the SOS flow:
   - With a Trusted Contact set, **Wi-Fi/data off**: confirm → SMS composer opens with the maps
     link; success screen shows SMS ✅ and server "ບໍ່ມີເນັດ / ຍັງບໍ່ເປີດໃຊ້ເຊີບເວີ". Proves offline path.
   - With no Trusted Contact and no server: confirm → clear `SosException` shown (nothing sent).
   - Passport screen: manual send button works and temp file is cleared afterward.

---

## 6. Phase 2 (roadmap) — near-real-time live tracking

Not part of Phase 1. Depends on a real backend existing. Purpose: after the first SOS, let the
user share a *continuous* location stream so help can follow them.

Rules that don't change:
- **Server/data channel only. Never SMS.** Continuous SMS would spam and cost money and is hard
  to monitor — the exact problem we're avoiding.
- **Still manual.** User taps "ເລີ່ມສົ່ງຕຳແໜ່ງສົດ" once; app streams until the user taps "ຢຸດ"
  (or help marks them safe). No silent/automatic streaming.

Shape when built:
- New `LiveTrackingService` (singleton): starts a periodic location fetch while active and writes
  each point to Supabase `sos_events` with `type: 'live'`. Foreground service + a persistent
  notification so the user always sees it's on.
- **User-configurable interval.** The send interval is a setting the user picks — not hardcoded.
  Store it in a small `SettingsStore` (secure storage or shared prefs), expose a control on the
  Settings/SOS screen. Suggest a default of **20s** and a sane range (e.g. 10s–5min): tighter =
  fresher but more battery/data.
- **Send only when online.** Each tick: if online, insert to Supabase; if offline, push the point
  to a local queue and flush it (in order) when connectivity returns. Never over SMS. The Phase-1
  SMS+link still covers the offline emergency case.
- Needs **background location** permission (Android `ACCESS_BACKGROUND_LOCATION`, iOS "Always").
- Backend is ready (Supabase) — this is buildable once Phase 1 lands.

## 7. Out of scope

- The console side of Supabase (reading/displaying events) — that lives in the Response Console.
- Theme/dark-mode/token work — that's `plan-theme-port.md`.
- Any change to encryption, `PassportStore`, or the security model.
