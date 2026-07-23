import 'dart:io';

import 'package:flutter/services.dart';

/// The outcome of a silent-send attempt.
enum SmsSilentResult {
  /// Handed to the SIM radio for delivery — no composer, nothing on screen.
  sent,

  /// Not Android: iOS has no silent-SMS API, so the caller must use the
  /// composer (or a server gateway).
  unsupported,

  /// SEND_SMS is not granted. The caller falls back to the composer for a
  /// normal SOS — but never for a duress alarm, where a composer would reveal
  /// it.
  noPermission,

  /// The send threw on the platform side (no SIM, radio off, carrier refusal).
  failed,
}

/// Sends SMS directly through the phone's SIM with no composer and no tap, via
/// the `safezone/sms` platform channel (see `MainActivity.kt`).
///
/// This is the piece that closes the duress hole: the old flow opened the OS
/// SMS composer, which pops up on screen where an attacker holding the phone
/// can see the silent alarm. A silent send shows nothing.
///
/// Android only. On iOS (no silent-SMS API) every call reports [unsupported]
/// and the caller keeps using the composer.
class SmsSender {
  SmsSender._();
  static final SmsSender instance = SmsSender._();

  static const MethodChannel _channel = MethodChannel('safezone/sms');

  bool get _isAndroid => Platform.isAndroid;

  /// Whether SEND_SMS is already granted.
  Future<bool> hasPermission() async {
    if (!_isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('hasSendSmsPermission') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Requests SEND_SMS and returns whether it ends up granted.
  ///
  /// Call this at a *calm* moment — adding a trusted contact — never during a
  /// trigger: a permission dialog in the middle of a duress alarm would both
  /// stall it and reveal it. A no-op (returns true immediately) once granted.
  Future<bool> ensurePermission() async {
    if (!_isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('requestSendSmsPermission') ??
          false;
    } catch (_) {
      return false;
    }
  }

  /// Sends [body] to every number in [recipients] silently. Does **not** prompt
  /// for permission — it only sends when already granted, so it is safe to call
  /// during a duress trigger.
  Future<SmsSilentResult> trySendSilently({
    required List<String> recipients,
    required String body,
  }) async {
    if (!_isAndroid) return SmsSilentResult.unsupported;
    if (recipients.isEmpty || body.isEmpty) return SmsSilentResult.failed;
    try {
      final res = await _channel.invokeMethod<String>('sendSms', {
        'recipients': recipients,
        'body': body,
      });
      switch (res) {
        case 'sent':
          return SmsSilentResult.sent;
        case 'no_permission':
          return SmsSilentResult.noPermission;
        default:
          return SmsSilentResult.failed;
      }
    } on MissingPluginException {
      return SmsSilentResult.unsupported;
    } catch (_) {
      return SmsSilentResult.failed;
    }
  }
}
