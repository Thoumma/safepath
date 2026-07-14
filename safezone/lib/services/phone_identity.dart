import 'package:supabase_flutter/supabase_flutter.dart';

/// Proves the user owns their phone number, via a real SMS one-time code.
///
/// ## Why this exists alongside [OtpService], and why they must not be merged
///
/// They answer different questions:
///
/// - [OtpService] (local) — *"is this a device I trust?"* It sends a code **to
///   your trusted contacts** through the OS composer, so they can approve a
///   login from an unfamiliar device.
/// - [PhoneIdentity] (this) — *"do you own this number?"* It sends a code **to
///   you**, from the server, and nobody but the holder of the SIM can read it.
///
/// The distinction is load-bearing. The Guardian tab answers "who listed my
/// number as their emergency contact?" — a social-graph query. If the app
/// trusted a number the user merely *typed*, anyone could enter a stranger's
/// number and learn who depends on them, who is travelling, and where they
/// are. A code you send to yourself through a composer you can already read
/// proves nothing. Only a server-sent SMS does.
///
/// The verified number arrives in the session JWT's `phone` claim, which the
/// console's `/api/*` routes verify. That is what makes the reverse lookup
/// safe to serve.
class PhoneIdentity {
  PhoneIdentity._();
  static final PhoneIdentity instance = PhoneIdentity._();

  GoTrueClient get _auth => Supabase.instance.client.auth;

  Session? get session => _auth.currentSession;

  /// The number Supabase has *proven* the user owns, or null. Never trust a
  /// number from [ProfileStore] for anything that reads other people's data —
  /// trust this.
  String? get verifiedPhone {
    final p = _auth.currentUser?.phone;
    if (p == null || p.isEmpty) return null;
    // Supabase stores the phone without a leading '+'; E.164 everywhere else.
    return p.startsWith('+') ? p : '+$p';
  }

  bool get isVerified => verifiedPhone != null;

  /// The bearer token the console's `/api/*` routes verify. Null when the user
  /// has not verified a phone, which is why the server channel degrades to
  /// `noProfile` rather than failing.
  String? get accessToken => session?.accessToken;

  /// Sends a 6-digit code by SMS. Throws [AuthException] on a bad number or a
  /// misconfigured SMS provider, which the UI surfaces in Lao.
  Future<void> sendCode(String phone) async {
    await _auth.signInWithOtp(phone: phone);
  }

  /// Returns true when [code] matches. On success the session carries a
  /// verified `phone` claim from here on.
  Future<bool> verifyCode(String phone, String code) async {
    final res = await _auth.verifyOTP(
      phone: phone,
      token: code,
      type: OtpType.sms,
    );
    return res.session != null;
  }

  Future<void> signOut() => _auth.signOut();
}
