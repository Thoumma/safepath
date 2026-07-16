import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/services/auth_service.dart';
import 'package:safezone/services/database_service.dart';
import 'package:safezone/utils/password_hasher.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

// Wrong-password attempts only touch SQLite + the hasher, so the throttle is
// fully testable with the ffi database and no platform channels. Successful
// unlocks reach DeviceIdentity/secure storage and are out of scope here.
void main() {
  const realPassword = 'correct-horse';
  late Directory tmpDir;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    tmpDir = Directory.systemTemp.createTempSync('safezone_lockout_');
    DatabaseService.testPathOverride = '${tmpDir.path}/safezone.db';
    DatabaseService.instance.overrideDatabaseForTest(null);
    AuthService.now = DateTime.now;

    final real = PasswordHasher.hash(realPassword);
    final fake = PasswordHasher.hash('battery-staple');
    final db = await DatabaseService.instance.db;
    await db.insert('app_user', {
      'real_hash': real.hash,
      'real_salt': real.salt,
      'fake_hash': fake.hash,
      'fake_salt': fake.salt,
      'created_at': 0,
    });
  });

  tearDown(() async {
    final db = await DatabaseService.instance.db;
    await db.close();
    DatabaseService.instance.overrideDatabaseForTest(null);
    DatabaseService.testPathOverride = null;
    AuthService.now = DateTime.now;
    tmpDir.deleteSync(recursive: true);
  });

  Future<void> failNTimes(int n) async {
    for (var i = 0; i < n; i++) {
      expect(await AuthService.instance.login('wrong-$i'),
          LoginResult.wrongPassword);
    }
  }

  test('attempts below the threshold are not throttled', () async {
    await failNTimes(4);
    expect(await AuthService.instance.lockoutRemaining(), Duration.zero);
  });

  test('the 5th failure locks; the next attempt is rejected even with the '
      'correct password', () async {
    await failNTimes(5);
    expect(await AuthService.instance.lockoutRemaining(),
        greaterThan(Duration.zero));
    expect(await AuthService.instance.login(realPassword),
        LoginResult.lockedOut);
  });

  test('lockout expires after the cooldown and failures resume counting',
      () async {
    final start = DateTime.now();
    AuthService.now = () => start;
    await failNTimes(5); // locked for 30s

    AuthService.now = () => start.add(const Duration(seconds: 29));
    expect(await AuthService.instance.login('still-wrong'),
        LoginResult.lockedOut);

    AuthService.now = () => start.add(const Duration(seconds: 31));
    // Past the deadline the attempt is evaluated again (and, being the 6th
    // failure, re-locks with a doubled cooldown).
    expect(await AuthService.instance.login('still-wrong'),
        LoginResult.wrongPassword);
    final second = await AuthService.instance.lockoutRemaining();
    expect(second, greaterThan(const Duration(seconds: 55)));
    expect(second, lessThanOrEqualTo(const Duration(seconds: 60)));
  });

  test('lockout survives an app restart', () async {
    await failNTimes(5);

    // Simulate a relaunch: drop the cached connection and reopen the same file.
    final db = await DatabaseService.instance.db;
    await db.close();
    DatabaseService.instance.overrideDatabaseForTest(null);

    expect(await AuthService.instance.login(realPassword),
        LoginResult.lockedOut);
  });

  test('cooldown never exceeds the 30-minute cap', () async {
    final start = DateTime.now();
    var current = start;
    AuthService.now = () => current;

    // 20 failures, stepping the clock past each cooldown so every attempt
    // is evaluated rather than swallowed by lockedOut.
    for (var i = 0; i < 20; i++) {
      await AuthService.instance.login('wrong-$i');
      current = current
          .add(await AuthService.instance.lockoutRemaining())
          .add(const Duration(seconds: 1));
    }

    // Trip it once more and inspect the fresh cooldown.
    await AuthService.instance.login('one-more');
    expect(await AuthService.instance.lockoutRemaining(),
        lessThanOrEqualTo(const Duration(minutes: 30)));
  });
}
