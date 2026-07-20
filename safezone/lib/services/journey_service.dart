import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import 'auth_service.dart';
import 'live_tracking_service.dart';
import 'location_service.dart';
import 'phone_identity.dart';

/// Streams the user's GPS to the console while **journey sharing** is switched
/// on — the routine, opt-in counterpart of [LiveTrackingService]. That one
/// exists for an open SOS case; this one exists so the people who trust each
/// other can watch a normal trip unfold ("she left the border crossing an hour
/// ago, she's fine") without anything being an emergency.
///
/// Deliberately a separate service, not a mode on [LiveTrackingService]: the
/// two run at the same time (an SOS mid-journey must not kill the journey
/// bookkeeping, and vice versa), post to different endpoints, and the SOS path
/// is duress-critical code that should not grow branches. The battery budget
/// differs too — a journey ticks every 60s where an emergency ticks every 20s,
/// because "roughly where is she" is a much cheaper question than "where is
/// she *right now*".
///
/// Duress-safe by the same construction as the SOS tracker. [start] is
/// decoy-gated so neither the stream nor its foreground notification can
/// originate under the fake password; [AuthService.lock] calls [stop], so the
/// notification is gone before any fake unlock; [_tick] re-checks the gate.
/// The opt-in flag itself lives in secure storage — invisible to an attacker —
/// and [resume] refuses to read it in decoy mode, so a coerced unlock cannot
/// even learn the feature was in use.
class JourneyService {
  JourneyService._();
  static final JourneyService instance = JourneyService._();

  /// One fix a minute. A journey is followed over hours, not seconds — three
  /// times gentler on the battery than the SOS tracker's 20s.
  static const Duration interval = Duration(seconds: 60);

  /// Hard stop per session. Long enough for any land border run or overnight
  /// bus; short enough that a toggle forgotten for a week does not quietly
  /// flatten batteries forever. Re-armed on the next app open ([resume]) as
  /// long as the flag is still on.
  static const Duration maxSession = Duration(hours: 12);

  /// Network timeout per ping — same rationale as the SOS tracker: a slow
  /// post must not stack behind the next tick.
  static const Duration _postTimeout = Duration(seconds: 8);

  /// How recent a background-stream fix must be for [_tick] to post it instead
  /// of paying for a one-shot read. ~2× [interval], mirroring the SOS tracker.
  static const Duration _freshWindow = Duration(seconds: 120);

  static const _kFlag = 'journey_sharing';
  final _storage = const FlutterSecureStorage();

  Timer? _timer;
  DateTime? _startedAt;
  bool _posting = false;

  StreamSubscription<Position>? _sub;
  Position? _lastFix;
  DateTime? _lastFixAt;
  bool _backgroundDenied = false;

  bool get isSharing => _timer != null;

  /// The persisted opt-in, regardless of whether the timer is currently
  /// running. What the Home toggle renders.
  Future<bool> isEnabled() async {
    if (flagReadOverride != null) return flagReadOverride!();
    return await _storage.read(key: _kFlag) == '1';
  }

  /// Flips the opt-in: persists the flag, starts/stops the stream, and
  /// best-effort tells the console (so "off" also deletes the server-side
  /// trail). The PUT failing is fine — the next breadcrumb re-asserts "on",
  /// and a stale "on" with no fresh points renders as "not sharing"
  /// everywhere.
  Future<void> setEnabled(bool on) async {
    if (flagWriteOverride != null) {
      await flagWriteOverride!(on);
    } else if (on) {
      await _storage.write(key: _kFlag, value: '1');
    } else {
      await _storage.delete(key: _kFlag);
    }

    if (on) {
      start();
    } else {
      stop();
    }
    unawaited(_putSharing(on));
  }

  /// Restarts the stream after an app relaunch or unlock if the user left the
  /// toggle on. The decoy gate comes *before* the flag read: in decoy mode the
  /// flag must not even be consulted, so no code path differs by its value.
  Future<void> resume() async {
    if (AuthService.instance.isDecoy) return;
    if (!AuthService.instance.isUnlocked) return;
    if (await isEnabled()) start();
  }

  /// Begins the periodic stream. Idempotent, like the SOS tracker, so screens
  /// may call it on every refresh.
  void start() {
    // ── Duress gate. Same rule, same reason, same shape as LiveTracking. ────
    if (AuthService.instance.isDecoy) return;
    if (!ConsoleConfig.isConfigured) return;
    if (_timer != null) return;

    _startedAt = DateTime.now();
    unawaited(_startBackgroundStream());
    unawaited(_tick());
    _timer = Timer.periodic(interval, (_) => _tick());
  }

  /// Tears everything down. The duress-critical line: cancelling the
  /// subscription removes the Android foreground-service notification, and
  /// [AuthService.lock] calls this, so nothing is visible or streaming before
  /// any fake-password unlock.
  void stop() {
    _sub?.cancel();
    _sub = null;
    _lastFix = null;
    _lastFixAt = null;
    _timer?.cancel();
    _timer = null;
    _startedAt = null;
  }

  /// Best-effort keep-alive stream, exactly like the SOS tracker's — except it
  /// defers entirely to an active SOS stream. geolocator multiplexes one
  /// platform stream, so two subscribers fight over settings (and notification
  /// text); the emergency wins, and its foreground service keeps the process
  /// alive for this timer too.
  Future<void> _startBackgroundStream() async {
    if (_backgroundDenied || _sub != null) return;
    if (LiveTrackingService.instance.isTracking) return;
    try {
      var perm = await Geolocator.checkPermission();
      if (perm != LocationPermission.always) {
        perm = await Geolocator.requestPermission();
      }
      if (perm != LocationPermission.always) {
        _backgroundDenied = true;
        return;
      }

      _sub = Geolocator.getPositionStream(locationSettings: _backgroundSettings())
          .listen(
        (pos) {
          _lastFix = pos;
          _lastFixAt = DateTime.now();
        },
        onError: (_) {},
        cancelOnError: false,
      );
    } catch (_) {
      _sub = null;
    }
  }

  LocationSettings _backgroundSettings() {
    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
        intervalDuration: interval,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          // Calm wording on purpose — this is a routine share, not an alarm.
          notificationTitle: 'SafeZone',
          notificationText: 'ກຳລັງແບ່ງປັນການເດີນທາງກັບຄົນໄວ້ໃຈ',
          enableWakeLock: false,
          setOngoing: false,
        ),
      );
    }
    if (Platform.isIOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
        allowBackgroundLocationUpdates: true,
        showBackgroundLocationIndicator: false,
        pauseLocationUpdatesAutomatically: false,
      );
    }
    return const LocationSettings(accuracy: LocationAccuracy.high);
  }

  @visibleForTesting
  bool cachedFixIsFresh(DateTime now) {
    final at = _lastFixAt;
    return _lastFix != null && at != null && now.difference(at) <= _freshWindow;
  }

  Future<void> _tick() async {
    // Defense in depth on the duress gate, mirroring the SOS tracker: if this
    // timer ever outlives a session change, refuse to stream the position of
    // whoever is now holding the phone.
    if (AuthService.instance.isDecoy || !AuthService.instance.isUnlocked) {
      stop();
      return;
    }

    // Cap before the overlap guard — same ordering bug-avoidance as the SOS
    // tracker: a hung fix pinning `_posting` must not make the cap unmissable.
    final startedAt = _startedAt;
    if (startedAt != null &&
        DateTime.now().difference(startedAt) > maxSession) {
      stop();
      return;
    }

    if (_posting) return;

    final token = PhoneIdentity.instance.accessToken;
    if (token == null) return; // not verified — nowhere to attach the point

    _posting = true;
    try {
      Position? pos;
      if (cachedFixIsFresh(DateTime.now())) {
        pos = _lastFix;
      } else {
        final loc = await LocationService.instance
            .getCurrentLocation(timeLimit: _postTimeout);
        pos = loc.position;
      }
      if (pos == null) return;

      final res = await http
          .post(
            ConsoleConfig.journeyTrackEndpoint,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'lat': pos.latitude,
              'lng': pos.longitude,
              'occurredAt': DateTime.now().toUtc().toIso8601String(),
            }),
          )
          .timeout(_postTimeout);

      // `sharing:false` means the console has no citizen profile to hang the
      // trail on. Stop posting — but keep the local flag, so the stream
      // resumes by itself once the profile sync lands.
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (body['sharing'] == false) stop();
      }
    } on SocketException {
      // Offline abroad — expected. Keep the timer; try the next tick.
    } on TimeoutException {
      // Slow network — same.
    } on http.ClientException {
      // DNS / connection failure — same.
    } catch (_) {
      // A journey tick must never crash the app.
    } finally {
      _posting = false;
    }
  }

  /// Mirrors the toggle to the console. Best-effort: an "on" that never lands
  /// is re-asserted by the first breadcrumb; an "off" that never lands goes
  /// stale within the freshness window and disappears from every map.
  Future<void> _putSharing(bool on) async {
    if (!ConsoleConfig.isConfigured) return;
    final token = PhoneIdentity.instance.accessToken;
    if (token == null) return;
    try {
      await http
          .put(
            ConsoleConfig.journeyEndpoint,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'sharing': on}),
          )
          .timeout(_postTimeout);
    } catch (_) {
      // Silent by design — see the doc comment.
    }
  }

  // ── Test seams (device-free). ─────────────────────────────────────────────
  /// Bypass secure storage under `flutter test`, where the platform channel
  /// does not exist. Reset both to null in tearDown.
  @visibleForTesting
  static Future<bool> Function()? flagReadOverride;

  @visibleForTesting
  static Future<void> Function(bool on)? flagWriteOverride;

  @visibleForTesting
  void debugSetSubscription(StreamSubscription<Position>? sub) => _sub = sub;

  @visibleForTesting
  bool get debugHasSubscription => _sub != null;

  @visibleForTesting
  void debugSetCachedFix(Position? fix, DateTime? at) {
    _lastFix = fix;
    _lastFixAt = at;
  }

  @visibleForTesting
  bool get debugHasCachedFix => _lastFix != null;
}
