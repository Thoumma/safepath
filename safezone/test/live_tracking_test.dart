import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:safezone/services/live_tracking_service.dart';

/// Device-free tests for the pieces of [LiveTrackingService] that don't need the
/// geolocator platform channel or a network. Full background behaviour (the
/// foreground service, permission dialogs, screen-off survival) is verified
/// on-device — see the plan's manual test matrix.
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
  final tracker = LiveTrackingService.instance;

  tearDown(tracker.stop); // reset singleton state between tests

  test('stop() tears down the background subscription and cached fix', () async {
    // The duress-critical guarantee: lock() → stop() must leave nothing
    // streaming (and so no foreground-service notification) before a fake unlock.
    final controller = StreamController<Position>();
    final sub = controller.stream.listen((_) {});
    tracker.debugSetSubscription(sub);
    tracker.debugSetCachedFix(_fix(), DateTime.now());

    expect(tracker.debugHasSubscription, isTrue);
    expect(tracker.debugHasCachedFix, isTrue);

    tracker.stop();

    expect(tracker.debugHasSubscription, isFalse);
    expect(tracker.debugHasCachedFix, isFalse);
    // The subscription was really cancelled, so the stream has no listener left.
    expect(controller.hasListener, isFalse);
    await controller.close();
  });

  test('cachedFixIsFresh: a recent fix is fresh, a stale one is not', () {
    final now = DateTime(2026, 1, 1, 12, 0, 0);

    tracker.debugSetCachedFix(_fix(), now.subtract(const Duration(seconds: 10)));
    expect(tracker.cachedFixIsFresh(now), isTrue);

    tracker.debugSetCachedFix(_fix(), now.subtract(const Duration(seconds: 60)));
    expect(tracker.cachedFixIsFresh(now), isFalse);
  });

  test('cachedFixIsFresh: no fix is never fresh', () {
    tracker.debugSetCachedFix(null, null);
    expect(tracker.cachedFixIsFresh(DateTime.now()), isFalse);
  });
}
