# SafeZone (Flutter MVP)

ແອັບຊ່ວຍຄົນລາວໃນຕ່າງປະເທດ: ຕູ້ເຊຟພາສປອດ (encrypted) + ປຸ່ມ SOS ສົ່ງ GPS ແລະ ສຳເນົາພາສປອດ ໃຫ້ Trusted Contact.

## ໂຄ້ດນີ້ມີຫຍັງແລ້ວ
- `lib/main.dart`, `lib/router.dart` — app + navigation (go_router) + auth gate (setup / lock / otp)
- `lib/services/auth_service.dart` — login ດ້ວຍລະຫັດຈິງ + ລະຫັດປອມ (duress → decoy vault + ແຈ້ງເຕືອນງຽບ), lockout ຫຼັງເດົາຜິດ 5 ເທື່ອ
- `lib/services/database_service.dart` — SQLite (`safezone.db`): app_user, known_devices, otp_codes, auth_state
- `lib/services/otp_service.dart`, `device_identity.dart` — ເຂົ້າລະບົບຈາກອຸປະກອນໃໝ່ຕ້ອງມີ OTP ຈາກ Trusted Contact
- `lib/services/crypto_service.dart` — AES-256 encrypt (key ໃນ secure storage)
- `lib/services/passport_store.dart` — ບັນທຶກພາສປອດແບບ encrypted ເທົ່ານັ້ນ
- `lib/services/contact_store.dart` — Trusted Contacts (ຫຼາຍຄົນໄດ້)
- `lib/services/location_service.dart` — GPS + permission
- `lib/services/sos_service.dart` — flow ສຸກເສີນ 2 ຊ່ອງທາງ: SMS + server (console)
- `lib/services/sos_server.dart`, `sos_outbox.dart` — ສົ່ງຫາ Response Console; ບໍ່ມີສັນຍານ = ເກັບຄິວໄວ້ ສົ່ງເມື່ອມີ signal
- `lib/services/profile_store.dart`, `guardian_service.dart` — ໂປຣໄຟລ໌ + Guardian
- `lib/screens/` — Setup, Lock, OTP, Home, Guardian, About, Passport, Contact, Profile, SOS
- `lib/config/` — CONSOLE_URL / SUPABASE_* (ຕັ້ງຜ່ານ `--dart-define`)

## ວິທີ run

ຕ້ອງມີ **Flutter SDK** ໃນເຄື່ອງ + ໂທລະສັບ/emulator. ([ຕິດຕັ້ງ Flutter](https://docs.flutter.dev/get-started/install))

```bash
cd safezone
flutter create .          # ສ້າງ android/ ios/ folders (ເທື່ອທຳອິດເທົ່ານັ້ນ)
flutter pub get
flutter run               # app ຢ່າງດຽວ (ບໍ່ມີ server channel)
.\run-lan.ps1             # app + Response Console ໃນ LAN ດຽວກັນ (ອ່ານ env ຈາກ safezone-console)
```

> `flutter create .` ຈະບໍ່ທັບ `lib/` ທີ່ມີຢູ່ — ມັນພຽງເພີ່ມ platform folders (android/, ios/) ທີ່ຍັງບໍ່ມີ.

## ⚠️ Permissions — ຕ້ອງເພີ່ມເອງ (ບໍ່ດັ່ງນັ້ນ crash)

ຫຼັງ `flutter create .` ໃຫ້ເພີ່ມ:

**`android/app/src/main/AndroidManifest.xml`** (ໃນ `<manifest>` ກ່ອນ `<application>`):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

**`ios/Runner/Info.plist`** (ໃນ `<dict>`):
```xml
<key>NSCameraUsageDescription</key>
<string>ໃຊ້ກ້ອງເພື່ອສະແກນພາສປອດ</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ໃຊ້ຄັງຮູບເພື່ອເລືອກພາສປອດ</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>ໃຊ້ຕຳແໜ່ງເພື່ອສົ່ງຈຸດສຸກເສີນ</string>
```

minSdkVersion: ບາງ plugin ຕ້ອງການ Android minSdk 21+ (ກວດ `android/app/build.gradle`).

## ໝາຍເຫດ scope
ມີ backend ແລ້ວ: **Response Console** (`../safezone-console`, Next.js + Supabase) ຮັບ SOS ຜ່ານ `/api/sos` ແລະ ເປີດ case ໃຫ້ duty officer. ແຕ່ OTP ແລະ duress alert ຍັງສົ່ງຜ່ານ SMS/email composer ຂອງ OS (ຜູ້ໃຊ້ຕ້ອງກົດສົ່ງເອງ) — ການສົ່ງແບບອັດຕະໂນມັດ/ງຽບແທ້ = roadmap (ເບິ່ງ `../SafeZone_Remaining_Work.md` ຂໍ້ 6).

demo flow ຫຼັກ: ຕັ້ງລະຫັດ → ສະແກນພາສປອດ → ຕັ້ງ contact → ກົດ SOS.
