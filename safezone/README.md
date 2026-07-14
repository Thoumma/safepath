# SafeZone (Flutter MVP)

ແອັບຊ່ວຍຄົນລາວໃນຕ່າງປະເທດ: ຕູ້ເຊຟພາສປອດ (encrypted) + ປຸ່ມ SOS ສົ່ງ GPS ແລະ ສຳເນົາພາສປອດ ໃຫ້ Trusted Contact.

## ໂຄ້ດນີ້ມີຫຍັງແລ້ວ
- `lib/main.dart`, `lib/router.dart` — app + navigation (go_router)
- `lib/services/crypto_service.dart` — AES-256 encrypt (key ໃນ secure storage)
- `lib/services/passport_store.dart` — ບັນທຶກພາສປອດແບບ encrypted ເທົ່ານັ້ນ
- `lib/services/contact_store.dart` — Trusted Contact
- `lib/services/location_service.dart` — GPS + permission
- `lib/services/sos_service.dart` — flow ສຸກເສີນ (GPS → SMS → share ໄຟລ໌)
- `lib/screens/` — Home, Passport, Contact, SOS
- `lib/widgets/primary_button.dart`

## ວິທີ run

ຕ້ອງມີ **Flutter SDK** ໃນເຄື່ອງ + ໂທລະສັບ/emulator. ([ຕິດຕັ້ງ Flutter](https://docs.flutter.dev/get-started/install))

```bash
cd safezone
flutter create .          # ສ້າງ android/ ios/ folders (ເທື່ອທຳອິດເທົ່ານັ້ນ)
flutter pub get
flutter run
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
Backend ແລະ ການເຊື່ອມຕໍ່ສະຖານທູດ = mock / roadmap. demo ໂຟກັສ flow ດຽວ: ສະແກນພາສປອດ → ຕັ້ງ contact → ກົດ SOS.
