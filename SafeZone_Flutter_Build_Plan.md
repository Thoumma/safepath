# SafeZone — Flutter MVP Build Plan (AI-Agent Ready)

> ເອກະສານນີ້ສ້າງມາເພື່ອ **ປ້ອນໃຫ້ເຄື່ອງມືຂຽນໂຄ້ດ AI** (Windsurf, Cursor, Google Antigravity ແລະ ອື່ນໆ).
> ແຕ່ລະ **Step** ມີ *prompt ສຳເລັດຮູບ* ໃຫ້ copy ໄປວາງໃນເຄື່ອງມືໄດ້ເລີຍ.
>
> _This doc is written to be fed into AI coding tools. Each Step has a ready-to-paste prompt._



---

## 0. ວິທີໃຊ້ / Workflow — ໃຊ້ model ໃຫ້ຖືກໜ້າທີ່

ໃຊ້ **model ເກັ່ງ (high-skill)** ສຳລັບ *ວາງແຜນ + ກວດ output*, ແລະ **free agentic IDE** ສຳລັບ *ຂຽນໂຄ້ດ*.

| ໜ້າວຽກ | ໃຊ້ຫຍັງ | ເຫດຜົນ |
|---|---|---|
| ວາງແຜນ / ອອກແບບ architecture | **High-skill model** (Claude Opus / GPT high) | ຄິດ trade-off, ກຳນົດ scope, ຂຽນ prompt ດີ |
| ຂຽນໂຄ້ດແຕ່ລະ Step | **Windsurf / Cursor / Antigravity** (free tier) | ສ້າງໄຟລ໌ໄວ, ມີ agent ແກ້ບັນຫາ inline |
| ກວດ / review output ແຕ່ລະ Step | **High-skill model** | ຈັບ bug, ກວດ security, ກວດວ່າ flow ຄົບ |

**ກົດ workflow:** ① ເອົາ prompt ຈາກ Step → ② ວາງໃນ IDE ໃຫ້ມັນຂຽນ → ③ copy ໂຄ້ດທີ່ໄດ້ກັບມາໃຫ້ high-skill model ກວດ → ④ ຄ່ອຍໄປ Step ຕໍ່ໄປ.

> **ໝາຍເຫດ:** ຢ່າໃຫ້ agent ຂຽນ MVP ໝົດໃນ prompt ດຽວ. ເຮັດເທື່ອລະ Step ຈະຄຸມຄຸນນະພາບໄດ້ດີກວ່າ.

---

## 1. ຂອບເຂດ MVP / Scope — flow ດຽວ

**Demo flow (P0 ທັງໝົດ):**

> ສຸກເສີນ → ກົດ **SOS** → ແອັບດຶງ **GPS** + **ສຳເນົາພາສປອດ (encrypted)** → ສົ່ງ **link ແຜນທີ່ + ໄຟລ໌** ໃຫ້ **Trusted Contact**

ສິ່ງທີ່ **ສ້າງຈິງ**: encrypt storage, GPS, ສົ່ງອອກ.
ສິ່ງທີ່ **mock ໄດ້**: backend, ການເຊື່ອມຕໍ່ສະຖານທູດ, account/login.

---

## 2. Tech Stack & Packages

- **Flutter** (stable channel) · Dart
- State: ເລີ່ມດ້ວຍ `setState` / `provider` (ຢ່າ over-engineer ສຳລັບ hackathon)

`pubspec.yaml` dependencies:

```yaml
dependencies:
  flutter:
    sdk: flutter
  go_router: ^14.0.0          # navigation
  image_picker: ^1.1.0        # ສະແກນ/ເລືອກຮູບພາສປອດ
  flutter_secure_storage: ^9.2.0  # ເກັບ AES key + contact
  encrypt: ^5.0.3             # AES encrypt ໄຟລ໌ຮູບ
  path_provider: ^2.1.0       # app documents dir
  geolocator: ^12.0.0         # GPS
  permission_handler: ^11.3.0 # ຂໍ permission
  url_launcher: ^6.3.0        # ເປີດ SMS / Google Maps
  share_plus: ^9.0.0          # ແບ່ງປັນໄຟລ໌
  provider: ^6.1.0
```

---

## 3. ໂຄງສ້າງ Folder / Project structure

```
lib/
  main.dart
  router.dart
  models/
    trusted_contact.dart
  services/
    crypto_service.dart      # AES encrypt/decrypt + key mgmt
    passport_store.dart      # save/load encrypted passport image
    contact_store.dart       # save/load trusted contact
    location_service.dart    # GPS + permission
    sos_service.dart         # ties it all together + send
  screens/
    home_screen.dart
    passport_screen.dart
    contact_screen.dart
    sos_screen.dart
  widgets/
    primary_button.dart
```

---

## 4. Data Model

```dart
// models/trusted_contact.dart
class TrustedContact {
  final String name;
  final String phone;   // E.164 e.g. +8562055xxxxxx
  final String? email;
  TrustedContact({required this.name, required this.phone, this.email});

  Map<String, dynamic> toJson() => {'name': name, 'phone': phone, 'email': email};
  factory TrustedContact.fromJson(Map<String, dynamic> j) =>
      TrustedContact(name: j['name'], phone: j['phone'], email: j['email']);
}
```

---

## 5. Build Steps — copy-paste prompts

> ແຕ່ລະ block ລຸ່ມນີ້ = 1 prompt. ວາງໃສ່ Windsurf / Cursor / Antigravity ເທື່ອລະ Step.

### Step 1 — Project init + dependencies

```
Create a new Flutter app named "safezone". Set up the folder structure under lib/:
models/, services/, screens/, widgets/. Add these dependencies to pubspec.yaml
and run flutter pub get:
go_router, image_picker, flutter_secure_storage, encrypt, path_provider,
geolocator, permission_handler, url_launcher, share_plus, provider.
Create empty placeholder files for each screen and service listed in this plan.
Do not implement logic yet — just scaffolding that compiles.
```

### Step 2 — Navigation + 4 screens skeleton

```
Using go_router, set up routes for 4 screens: HomeScreen ('/'),
PassportScreen ('/passport'), ContactScreen ('/contact'), SosScreen ('/sos').
HomeScreen shows a title "SafeZone" and three buttons navigating to the other
three screens, plus a large red "SOS" button at the bottom that goes to /sos.
Use Material 3, a clean blue+white theme. Make a reusable PrimaryButton widget.
Each screen should compile and show its title for now.
```

### Step 3 — Crypto service (security-critical)

```
Implement lib/services/crypto_service.dart:
- On first run, generate a random 256-bit AES key and store it in
  flutter_secure_storage under key 'safezone_aes_key' (base64).
- Provide encryptBytes(Uint8List) -> Uint8List and decryptBytes(Uint8List) -> Uint8List
  using AES (CBC or GCM) from the 'encrypt' package, with a random IV prepended to
  the ciphertext. Read the IV back on decrypt.
- Expose a singleton CryptoService.instance.
Write it cleanly with error handling. Add short comments.
```

### Step 4 — Passport capture + encrypted storage

```
Implement lib/services/passport_store.dart and wire up PassportScreen:
- PassportScreen has a button "Scan / Pick passport" using image_picker (camera or gallery).
- On pick: read image bytes, encrypt with CryptoService, save the encrypted bytes to
  a file 'passport.enc' in getApplicationDocumentsDirectory() via path_provider.
- Show a thumbnail of the decrypted image if a saved passport exists (decrypt on the fly).
- passport_store.dart exposes: savePassport(Uint8List), Future<Uint8List?> loadPassport(),
  bool hasPassport().
Keep the original unencrypted image only in memory, never written to disk.
```

### Step 5 — Trusted contact

```
Implement lib/services/contact_store.dart and ContactScreen:
- ContactScreen: form with name, phone (E.164 hint), optional email; Save button.
- Persist TrustedContact as JSON in flutter_secure_storage under 'trusted_contact'.
- contact_store.dart exposes saveContact(TrustedContact) and Future<TrustedContact?> loadContact().
- ContactScreen pre-fills the form if a contact is already saved.
Use the TrustedContact model from this plan.
```

### Step 6 — Location service

```
Implement lib/services/location_service.dart:
- Future<Position?> getCurrentLocation(): request location permission via
  permission_handler / geolocator, handle denied + serviceDisabled cases,
  return current Position or null.
- Helper mapsUrl(double lat, double lng) -> 'https://maps.google.com/?q=lat,lng'.
Return clear errors so the UI can show a message.
```

### Step 7 — SOS service + SOS screen (the demo core)

```
Implement lib/services/sos_service.dart and SosScreen:
sos_service.dart triggerSos():
  1. get current location (LocationService)
  2. load trusted contact (ContactStore); if none, throw a friendly error
  3. load + decrypt passport (PassportStore)
  4. build an SMS body: "SafeZone EMERGENCY. My location: <mapsUrl>. Please help."
  5. open SMS to the contact's phone with that body via url_launcher
  6. share the decrypted passport image file via share_plus (Share.shareXFiles)
SosScreen:
  - big red SOS button; on tap show a confirm dialog, then call triggerSos()
  - show loading spinner while working, then a success screen "Sent to <contact name>"
  - show readable error messages (no passport saved / no contact / GPS off)
```

### Step 8 — Permissions config + polish

```
Configure platform permissions:
- Android: in android/app/src/main/AndroidManifest.xml add INTERNET, CAMERA,
  ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION.
- iOS: in ios/Runner/Info.plist add NSCameraUsageDescription,
  NSLocationWhenInUseUsageDescription, NSPhotoLibraryUsageDescription with Lao+English text.
Polish: app icon, loading states, empty states on Home showing whether passport and
contact are set up (green check / grey). Make the SOS flow feel instant and reassuring.
```

---

## 6. Permissions ໂດຍຫຍໍ້ (ຢ່າລືມ — ບໍ່ດັ່ງນັ້ນ crash)

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

**iOS** — `ios/Runner/Info.plist`: ເພີ່ມ `NSCameraUsageDescription`,
`NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`.

---

## 7. Review checklist — ໃຫ້ high-skill model ກວດ ຫຼັງແຕ່ລະ Step

- [ ] ໂຄ້ດ compile ບໍ່ມີ error / warning ສຳຄັນ
- [ ] ຮູບພາສປອດ **ບໍ່ເຄີຍ** ຖືກ save ແບບບໍ່ encrypt ລົງ disk
- [ ] AES key ຢູ່ໃນ `flutter_secure_storage` ບໍ່ແມ່ນ hard-code
- [ ] IV ສຸ່ມໃໝ່ທຸກຄັ້ງ ແລະ ອ່ານກັບໄດ້ຖືກຕ້ອງ
- [ ] permission denied / GPS ປິດ / ບໍ່ມີ contact → ມີຂໍ້ຄວາມ error ທີ່ເຂົ້າໃຈ
- [ ] SOS flow ເຮັດວຽກ end-to-end ໃນເຄື່ອງຈິງ (ບໍ່ແມ່ນແຕ່ emulator)
- [ ] UI ສະອາດ, ປຸ່ມ SOS ເຫັນຊັດ, ມີ loading + success state

---

## 8. Demo script (1–2 ນາທີ)

1. ເປີດແອັບ → Home ສະແດງ "ພາສປອດ ✓ / Contact ✓"
2. (ກຽມໄວ້ກ່ອນ) ສະແກນພາສປອດ + ຕັ້ງ trusted contact
3. ສະແດງສະຖານະການ: "ສົມມຸດເຈົ້າຖືກຍຶດພາສປອດ ແລະ ຕ້ອງການຊ່ວຍ"
4. ກົດ **SOS** → ສະແດງ loading → success "ສົ່ງໃຫ້ [ຊື່] ແລ້ວ"
5. ເປີດ SMS/share ໃຫ້ກຳມະການເຫັນ link ແຜນທີ່ + ໄຟລ໌ພາສປອດ
6. ປິດທ້າຍ: ເລົ່າ vision (offline, web backup, ສະຖານທູດ partnership) — **ບອກວ່າເປັນ roadmap**

---

## 9. ລຳດັບເວລາ / Timeline (ອາທິດທີ່ເຫຼືອ)

| ມື້ | ເຮັດຫຍັງ |
|---|---|
| 4 | Step 1–4 (skeleton + passport vault) |
| 5 | Step 5–7 (contact + SOS core) |
| 6 | Step 8 (permissions + polish) + ທົດສອບເຄື່ອງຈິງ |
| 7 | ຊ້ອມ demo + ກຽມຄຳຕອບກຳມະການ (ເບິ່ງ Validation Canvas ສ່ວນ E) |

---

_ສ້າງໂດຍທີມ SafeZone · ໃຊ້ຄູ່ກັບ `SafeZone_Validation_Canvas.docx`_
