import 'dart:async';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:safezone/services/auth_service.dart';
import 'package:safezone/services/database_service.dart';
import 'package:safezone/services/journey_service.dart';
import 'package:safezone/utils/password_hasher.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Device-free tests for [JourneyService], mirroring `live_tracking_test.dart`
/// for the mechanics and adding the duress drills: the fake-password session
/// must neither start a journey stream nor even *read* the opt-in flag, and
/// lock() must tear down a running share before any fake unlock.
Position _fix() => Position(
      latitude: 17.97,
      longitude: 102.63,
      timestamp: DateTime.now(),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

void main() {
  final journey = JourneyService.instance;

  tearDown(() {
    journey.stop(); // reset singleton state between tests
    JourneyService.flagReadOverride = null;
    JourneyService.flagWriteOverride = null;
  });

  test('stop() tears down the background subscription and cached fix', () async {
    // The duress-critical guarantee, same as the SOS tracker: lock() → stop()
    // must leave nothing streaming (and so no foreground-service notification)
    // before a fake unlock.
    final controller = StreamController<Position>();
    final sub = controller.stream.listen((_) {});
    journey.debugSetSubscription(sub);
    journey.debugSetCachedFix(_fix(), DateTime.now());

    expect(journey.debugHasSubscription, isTrue);
    expect(journey.debugHasCachedFix, isTrue);

    journey.stop();

    expect(journey.debugHasSubscription, isFalse);
    expect(journey.debugHasCachedFix, isFalse);
    expect(controller.hasListener, isFalse);
    await controller.close();
  });

  test('cachedFixIsFresh: a recent fix is fresh, a stale one is not', () {
    final now = DateTime(2026, 1, 1, 12, 0, 0);

    // The journey window is 120s (2× the 60s interval), wider than the SOS
    // tracker's 45s.
    journey.debugSetCachedFix(_fix(), now.subtract(const Duration(seconds: 90)));
    expect(journey.cachedFixIsFresh(now), isTrue);

    journey.debugSetCachedFix(_fix(), now.subtract(const Duration(seconds: 180)));
    expect(journey.cachedFixIsFresh(now), isFalse);

    journey.debugSetCachedFix(null, null);
    expect(journey.cachedFixIsFresh(now), isFalse);
  });

  test('setEnabled persists the flag and setEnabled(false) tears down', () async {
    bool? written;
    JourneyService.flagWriteOverride = (on) async => written = on;

    await journey.setEnabled(true);
    expect(written, isTrue);

    // Arm a fake subscription, then disable — everything must be torn down.
    final controller = StreamController<Position>();
    journey.debugSetSubscription(controller.stream.listen((_) {}));
    await journey.setEnabled(false);
    expect(written, isFalse);
    expect(journey.debugHasSubscription, isFalse);
    expect(journey.isSharing, isFalse);
    await controller.close();
  });

  test('resume() while locked does not consult the flag', () async {
    // Locked phone: resume() must be inert — it may not even read the opt-in.
    var flagRead = false;
    JourneyService.flagReadOverride = () async {
      flagRead = true;
      return true;
    };

    expect(AuthService.instance.isUnlocked, isFalse);
    await journey.resume();
    expect(flagRead, isFalse);
    expect(journey.isSharing, isFalse);
  });

  group('duress', () {
    late Directory tmpDir;

    setUpAll(() {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    });

    setUp(() async {
      tmpDir = Directory.systemTemp.createTempSync('safezone_journey_');
      DatabaseService.testPathOverride = '${tmpDir.path}/safezone.db';
      DatabaseService.instance.overrideDatabaseForTest(null);

      final real = PasswordHasher.hash('correct-horse');
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
      AuthService.instance.lock(); // reset the singleton session
      final db = await DatabaseService.instance.db;
      await db.close();
      DatabaseService.instance.overrideDatabaseForTest(null);
      DatabaseService.testPathOverride = null;
      tmpDir.deleteSync(recursive: true);
    });

    test('decoy session: start() refuses and resume() never reads the flag',
        () async {
      // The fake (duress) password opens the decoy vault. (The silent alert it
      // fires is best-effort and swallows the missing platform channels here.)
      expect(await AuthService.instance.login('battery-staple'),
          LoginResult.unlockedFakeDecoy);
      expect(AuthService.instance.isDecoy, isTrue);

      var flagRead = false;
      JourneyService.flagReadOverride = () async {
        flagRead = true;
        return true; // even a saved "on" must not start anything in decoy
      };

      journey.start();
      expect(journey.isSharing, isFalse);

      await journey.resume();
      // The decoy gate sits *before* the flag read: in a coerced session the
      // service may not even learn whether journey sharing was in use.
      expect(flagRead, isFalse);
      expect(journey.isSharing, isFalse);
    });

    test('lock() tears down a running journey stream', () async {
      // Simulate a share armed during a real session.
      final controller = StreamController<Position>();
      journey.debugSetSubscription(controller.stream.listen((_) {}));
      journey.debugSetCachedFix(_fix(), DateTime.now());

      AuthService.instance.lock();

      // The single lock choke point every path to the decoy passes through
      // must leave nothing streaming — this is what guarantees the foreground
      // notification is gone before a fake-password unlock.
      expect(journey.debugHasSubscription, isFalse);
      expect(journey.debugHasCachedFix, isFalse);
      expect(controller.hasListener, isFalse);
      await controller.close();
    });
  });
}
