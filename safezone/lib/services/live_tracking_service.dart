import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import 'auth_service.dart';
import 'location_service.dart';
import 'phone_identity.dart';

/// Streams the user's GPS to the console at a fixed interval while their SOS
/// case is open, so a duty officer — and the trusted contacts on the Guardian
/// screen — can follow the person *moving* instead of seeing one frozen point
/// from when they first pressed SOS.
///
/// This is the interval ("cron"-style) sender that sits on top of the one-shot
/// [SosService.triggerSos]. A fixed 20s [Timer] is the poster; on top of it a
/// best-effort background stream ([Geolocator.getPositionStream] with an Android
/// foreground service / iOS background-location mode) keeps the process alive so
/// tracking continues with the screen off or the app backgrounded, and refreshes
/// a cached fix the timer posts. If the OS or the user refuses the background
/// grant, the stream simply never starts and the service degrades to exactly its
/// old foreground-only behaviour — no regression.
///
/// Duress-safe by construction. [start] is decoy-gated, so neither the stream
/// nor its (decoy-tell) foreground notification can ever *originate* under the
/// fake password. [stop] cancels the stream — tearing down the notification —
/// and [AuthService.lock] calls [stop], so the single lock choke point guarantees
/// the notification is gone before any fake-password unlock. [_tick] re-checks
/// the decoy/locked gate as defense in depth. geolocator has no headless isolate:
/// if the process is killed the foreground service dies with it, so there is no
/// path where fixes are collected or posted without this Dart gate running.
///
/// A singleton like every other service, so any screen can `start()`/`stop()`
/// it without threading an instance around.
class LiveTrackingService {
  LiveTrackingService._();
  static final LiveTrackingService instance = LiveTrackingService._();

  /// How often a fresh fix is sent. Short enough to be useful to a rescue, long
  /// enough not to flatten a battery the traveller may need for hours.
  static const Duration interval = Duration(seconds: 20);

  /// Hard stop. A tracker left running forever would drain the battery of the
  /// exact person who cannot afford a dead phone. The console keeps the case
  /// open regardless; the device simply stops volunteering new points.
  static const Duration maxDuration = Duration(hours: 2);

  /// Network timeout per ping. Kept short: a slow fix must not stack up behind
  /// the next tick, and a missed ping just waits for the following interval.
  static const Duration _postTimeout = Duration(seconds: 8);

  /// How recent a background-stream fix must be for [_tick] to post it instead
  /// of taking a one-shot fix. Roughly 2× [interval] so a stream that quietly
  /// dies can't keep re-posting one frozen point — a stale cache falls back to a
  /// live one-shot read.
  static const Duration _freshWindow = Duration(seconds: 45);

  Timer? _timer;
  DateTime? _startedAt;
  bool _posting = false;

  /// The background-location subscription that keeps the process alive. Null when
  /// running foreground-only (background denied, unsupported, or not yet started).
  StreamSubscription<Position>? _sub;
  Position? _lastFix;
  DateTime? _lastFixAt;

  /// Set once the user declines the Always/background grant so the escalation
  /// isn't re-fired on every idempotent [start] (Home refreshes call it often).
  bool _backgroundDenied = false;

  bool get isTracking => _timer != null;

  /// Begins periodic tracking. Safe to call repeatedly — a second call while
  /// already running is a no-op, so screens can call it on every refresh (e.g.
  /// Home resuming an open case) without stacking timers.
  void start() {
    // ── Duress gate. Same rule as GuardianService / CaseService. ────────────
    // In decoy mode an attacker is holding the phone; a live stream of the
    // victim's position is the last thing to volunteer. The one-shot duress
    // alert already sent the initial fix silently — that is all it should.
    if (AuthService.instance.isDecoy) return;
    if (!ConsoleConfig.isConfigured) return;
    if (_timer != null) return;

    _startedAt = DateTime.now();
    // Best-effort: keep the process alive in the background. Never throws into
    // start() — on any failure the timer below runs foreground-only, as before.
    unawaited(_startBackgroundStream());
    // Fire once immediately so the trail starts without waiting a full interval.
    unawaited(_tick());
    _timer = Timer.periodic(interval, (_) => _tick());
  }

  void stop() {
    // Cancelling the subscription tears down the Android foreground service and
    // its notification. This is the duress-critical line: lock() → stop() must
    // leave nothing visible or streaming before any fake-password unlock.
    _sub?.cancel();
    _sub = null;
    _lastFix = null;
    _lastFixAt = null;
    _timer?.cancel();
    _timer = null;
    _startedAt = null;
  }

  /// Escalates to background ("Always") location and subscribes to a stream that
  /// keeps the process alive. Entirely best-effort: any failure — permission
  /// declined, platform refusal, unsupported OS — leaves [_sub] null and the
  /// foreground-only [Timer] carries on exactly as before.
  Future<void> _startBackgroundStream() async {
    if (_backgroundDenied || _sub != null) return;
    try {
      // whileInUse is already obtained by the one-shot fix on the first ping.
      // Escalate to Always only here — after the decoy gate in start() — so a
      // background-location dialog never lands on the duress path or at setup.
      var perm = await Geolocator.checkPermission();
      if (perm != LocationPermission.always) {
        perm = await Geolocator.requestPermission();
      }
      if (perm != LocationPermission.always) {
        // Only whileInUse (or nothing). Run foreground-only and don't nag again
        // this session; a new grant needs an app restart, which is acceptable.
        _backgroundDenied = true;
        return;
      }

      _sub = Geolocator.getPositionStream(locationSettings: _backgroundSettings())
          .listen(
        (pos) {
          _lastFix = pos;
          _lastFixAt = DateTime.now();
        },
        // Location turned off mid-track, etc. Keep the timer alive; _tick falls
        // back to a one-shot fix. Don't tear down — a transient error may recover.
        onError: (_) {},
        cancelOnError: false,
      );
    } catch (_) {
      // Bad settings, platform-channel error, FGS refused — degrade silently to
      // foreground-only. No regression versus the pre-background behaviour.
      _sub = null;
    }
  }

  /// Platform location settings for the keep-alive stream. On Android this
  /// attaches the foreground-service notification (required by the OS to run a
  /// location FGS); on iOS it enables background location updates.
  LocationSettings _backgroundSettings() {
    if (Platform.isAndroid) {
      return AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
        intervalDuration: interval,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'SafeZone',
          notificationText: 'ກຳລັງແບ່ງປັນຕຳແໜ່ງສຸກເສີນ',
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

  /// True when the background stream has delivered a fix recent enough to post
  /// without taking a fresh one-shot read. Pure (takes [now]) so it is testable.
  @visibleForTesting
  bool cachedFixIsFresh(DateTime now) {
    final at = _lastFixAt;
    return _lastFix != null && at != null && now.difference(at) <= _freshWindow;
  }

  Future<void> _tick() async {
    // ── Defense in depth on the duress gate. ────────────────────────────────
    // lock() stops this timer proactively, so under normal flow it is already
    // dead before any fake-password unlock. This is the second lock on the same
    // door: if the timer ever outlived a session change, refuse to stream the
    // position of whoever is now holding the phone. Locked-but-not-decoy is
    // stopped too — a locked phone volunteers nothing.
    if (AuthService.instance.isDecoy || !AuthService.instance.isUnlocked) {
      stop();
      return;
    }

    // Battery guard *before* the overlap guard: a fix that hangs leaves
    // `_posting` true, so if the overlap check came first every later tick would
    // short-circuit and the cap would never fire — the timer would outlive its
    // 2-hour limit indefinitely. Checking the cap first makes it unmissable.
    final startedAt = _startedAt;
    if (startedAt != null &&
        DateTime.now().difference(startedAt) > maxDuration) {
      stop();
      return;
    }

    // Don't let a slow tick overlap the next one.
    if (_posting) return;

    final token = PhoneIdentity.instance.accessToken;
    if (token == null) return; // not verified — no case to attach a point to

    _posting = true;
    try {
      // Prefer a fresh fix the background stream already delivered (instant, and
      // available even when the screen is off). Only when the cache is stale or
      // empty — no background grant, or the stream is quiet — pay for a one-shot
      // read, time-limited so a hung fix can't pin `_posting` true forever.
      Position? pos;
      if (cachedFixIsFresh(DateTime.now())) {
        pos = _lastFix;
      } else {
        final loc = await LocationService.instance
            .getCurrentLocation(timeLimit: _postTimeout);
        pos = loc.position;
      }
      if (pos == null) return; // no fix this tick; try again next interval

      final res = await http
          .post(
            ConsoleConfig.caseTrackEndpoint,
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

      // The console says the case is closed → stop volunteering points. This is
      // how "I'm safe" from any device, and an officer resolving the case, both
      // reach the tracker and end it.
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        if (body['open'] == false) stop();
      }
      // Any other status (401 expired, 5xx, etc.) just skips this tick; the
      // timer keeps the tracker alive for the next one.
    } on SocketException {
      // Offline abroad — expected. Keep the timer; try the next tick.
    } on TimeoutException {
      // Slow network — same.
    } on http.ClientException {
      // DNS / connection failure — same.
    } catch (_) {
      // A tracking tick must never crash the app.
    } finally {
      _posting = false;
    }
  }

  // ── Test seams (device-free). ─────────────────────────────────────────────
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
