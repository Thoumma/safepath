import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/console_config.dart';
import '../config/supabase_config.dart';
import 'phone_identity.dart';
import 'profile_store.dart';

/// Outcome of the server channel. Distinguished so the SOS screen can tell the
/// user *why* nothing reached the server — "no signal" and "it broke" call for
/// very different reactions from someone in trouble.
enum ServerStatus {
  sent,

  /// Reached the network but the write failed.
  failed,

  /// No connectivity. Expected abroad; the SMS channel still covers this.
  skippedOffline,

  /// No profile, or the phone was never verified — so there is no citizen to
  /// open a case for. Distinct from [notConfigured]: the app is fine, the
  /// *user* has a step left. Telling them "the server is off" would be a lie.
  noProfile,

  /// App built without a console URL / Supabase credentials, or init failed.
  notConfigured,
}

/// Reports the user's emergency to the Response Console, which upserts their
/// citizen record and opens a case in the duty officer's inbox.
///
/// This channel never throws: an emergency must not be aborted because the
/// network is down. Every failure is reported as a [ServerStatus] instead, and
/// the SMS channel — which needs no internet — carries on regardless.
class SosServer {
  SosServer._();
  static final SosServer instance = SosServer._();

  /// Set by [init]. When false, every send reports `notConfigured`.
  bool _ready = false;
  bool get isReady => _ready;

  /// Called once from main(). Safe to call with no network — this only
  /// constructs the client, it does not talk to the server.
  Future<void> init() async {
    if (!SupabaseConfig.isConfigured) return;
    try {
      await Supabase.initialize(
        url: SupabaseConfig.url,
        publishableKey: SupabaseConfig.publishableKey,
      );
      _ready = true;
    } catch (_) {
      // A broken/absent config must not stop the app from booting — SOS still
      // works over SMS, which is the channel that matters when offline.
      _ready = false;
    }
  }

  /// Opens a case in the console for the user's current location.
  ///
  /// [duress] is set when the user unlocked with their *fake* password under
  /// coercion. It is a server-side flag only: the case is raised to CRITICAL so
  /// the duty officer knows the person was forced, while the device shows the
  /// attacker absolutely nothing different. Never surface it in the UI.
  ///
  /// [occurredAt] is when the emergency actually happened, which is not when
  /// this call runs if the alert sat in [SosOutbox] waiting for signal. The
  /// console uses it to mark a delayed case as delayed — a two-hour-old GPS fix
  /// read as a live one sends the rescue to where the person used to be.
  /// Defaults to now, i.e. a live send.
  Future<ServerStatus> sendLocation({
    required double lat,
    required double lng,
    required String mapsUrl,
    bool duress = false,
    DateTime? occurredAt,
    Duration timeout = const Duration(seconds: 8),
  }) async {
    if (!_ready || !ConsoleConfig.isConfigured) {
      return ServerStatus.notConfigured;
    }

    // The console keys citizens by passport number and authenticates the caller
    // by their verified phone claim. Without both there is no case to open.
    final profile = await ProfileStore.instance.load();
    final token = PhoneIdentity.instance.accessToken;
    if (profile == null || !profile.phoneVerified || token == null) {
      return ServerStatus.noProfile;
    }

    try {
      final res = await http
          .post(
            ConsoleConfig.sosEndpoint,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'passportNo': profile.passportNo,
              'fullName': profile.fullName,
              'phone': profile.phone,
              'lat': lat,
              'lng': lng,
              'mapsUrl': mapsUrl,
              'type': duress ? 'DURESS' : 'SOS',
              'duress': duress,
              'occurredAt':
                  (occurredAt ?? DateTime.now()).toUtc().toIso8601String(),
            }),
          )
          .timeout(timeout);

      if (res.statusCode == 200 || res.statusCode == 201) {
        return ServerStatus.sent;
      }
      if (res.statusCode == 401) {
        // The verified session expired. Not a crash — the user just needs to
        // verify again, which is the same remedy as having no profile.
        return ServerStatus.noProfile;
      }
      return ServerStatus.failed;
    } on SocketException {
      return ServerStatus.skippedOffline;
    } on TimeoutException {
      return ServerStatus.skippedOffline;
    } on http.ClientException {
      // package:http raises this for DNS / connection failures, which is what
      // "no signal abroad" actually looks like on Android.
      return ServerStatus.skippedOffline;
    } catch (_) {
      return ServerStatus.failed;
    }
  }
}
