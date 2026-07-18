import 'dart:async';
import 'dart:convert';
import 'dart:io';

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
/// [SosService.triggerSos]. It runs while the app is open **and unlocked**:
/// [AuthService.lock] stops it, so a locked phone — and therefore any following
/// fake-password unlock — streams nothing. True background tracking (screen off
/// / app killed) needs a native foreground service and
/// `ACCESS_BACKGROUND_LOCATION`, and would raise a decoy-mode tell (a persistent
/// tracking notification) — deliberately out of scope here.
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

  Timer? _timer;
  DateTime? _startedAt;
  bool _posting = false;

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
    // Fire once immediately so the trail starts without waiting a full interval.
    unawaited(_tick());
    _timer = Timer.periodic(interval, (_) => _tick());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _startedAt = null;
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
      // Time-limit the GPS acquisition too, not just the POST. Without this a
      // hung fix would pin `_posting` true forever (see the cap note above).
      final loc = await LocationService.instance
          .getCurrentLocation(timeLimit: _postTimeout);
      final pos = loc.position;
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
}
