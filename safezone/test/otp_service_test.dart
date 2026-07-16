import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/models/trusted_contact.dart';
import 'package:safezone/services/database_service.dart';
import 'package:safezone/services/device_identity.dart';
import 'package:safezone/services/otp_service.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

// With the device key pinned and delivery disabled, generate/verify only touch
// SQLite + the hasher — no secure storage, no url_launcher platform channels.
void main() {
  const deviceKey = 'test-device-key';
  final contacts = [
    TrustedContact(name: 'ນາງ ຄຳຫລ້າ', phone: '+8562055512345'),
  ];
  late Directory tmpDir;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() {
    tmpDir = Directory.systemTemp.createTempSync('safezone_otp_');
    DatabaseService.testPathOverride = '${tmpDir.path}/safezone.db';
    DatabaseService.instance.overrideDatabaseForTest(null);
    DeviceIdentity.testKeyOverride = deviceKey;
    OtpService.deliveryEnabled = false;
    OtpService.now = DateTime.now;
  });

  tearDown(() async {
    final db = await DatabaseService.instance.db;
    await db.close();
    DatabaseService.instance.overrideDatabaseForTest(null);
    DatabaseService.testPathOverride = null;
    DeviceIdentity.testKeyOverride = null;
    OtpService.deliveryEnabled = true;
    OtpService.now = DateTime.now;
    tmpDir.deleteSync(recursive: true);
  });

  test('a generated code verifies exactly once', () async {
    final code = await OtpService.instance.generateAndSend(contacts);
    expect(code, hasLength(6));
    expect(await OtpService.instance.verify(code), isTrue);
    // Single-use: the same code must not unlock a second time.
    expect(await OtpService.instance.verify(code), isFalse);
  });

  test('a wrong code fails and does not consume the pending one', () async {
    final code = await OtpService.instance.generateAndSend(contacts);
    final wrong = code == '000000' ? '000001' : '000000';
    expect(await OtpService.instance.verify(wrong), isFalse);
    expect(await OtpService.instance.verify(code), isTrue);
  });

  test('a code no longer verifies after its 10-minute expiry', () async {
    final start = DateTime.now();
    OtpService.now = () => start;
    final code = await OtpService.instance.generateAndSend(contacts);

    OtpService.now = () => start.add(const Duration(minutes: 11));
    expect(await OtpService.instance.verify(code), isFalse);
  });

  test('generating a new code invalidates the earlier pending one', () async {
    final first = await OtpService.instance.generateAndSend(contacts);
    final second = await OtpService.instance.generateAndSend(contacts);
    expect(await OtpService.instance.verify(first), isFalse);
    expect(await OtpService.instance.verify(second), isTrue);
  });

  test('a code issued to one device does not verify on another', () async {
    final code = await OtpService.instance.generateAndSend(contacts);
    DeviceIdentity.testKeyOverride = 'other-device-key';
    expect(await OtpService.instance.verify(code), isFalse);
    // Back on the issuing device it still works.
    DeviceIdentity.testKeyOverride = deviceKey;
    expect(await OtpService.instance.verify(code), isTrue);
  });
}
