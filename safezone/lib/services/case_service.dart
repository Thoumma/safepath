import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import '../models/guardian.dart';
import 'auth_service.dart';
import 'phone_identity.dart';

/// The user's *own* open case, and the way to stand it down.
///
/// Until this existed a case stayed `NEW` forever: the duty officer kept an
/// open emergency on their board, and everyone in the user's Guardian list kept
/// seeing them as ສຸກເສີນ long after they were fine. The alarm could be raised
/// but never lowered.
///
/// Reuses [GuardianCase] deliberately — `/api/me/case` returns the same shape
/// as the case embedded in `/api/me/guardians`, because it is the same row.
class CaseService {
  CaseService._();
  static final CaseService instance = CaseService._();

  bool get _blocked =>
      // ── Duress gate. Same rule as GuardianService, for the same reason. ────
      //
      // In decoy mode an attacker is holding the phone. Two separate hazards,
      // and this one line closes both:
      //
      //   - Showing an open case would tell them the user has an emergency
      //     running, which is exactly what the decoy exists to hide.
      //   - "I'm safe" is a button that *cancels an emergency*. Never put that
      //     within reach of the person who caused it.
      //
      // The console refuses to serve or resolve DURESS cases at all (see
      // api/me/case/route.ts). This is the second lock on the same door: the
      // request is never even made.
      AuthService.instance.isDecoy ||
      !ConsoleConfig.isConfigured ||
      PhoneIdentity.instance.accessToken == null;

  /// The user's open case, or null. Null on *any* failure — an unreachable
  /// server must read as "no open case" and simply hide the banner, never as an
  /// error the user has to dismiss on the home screen.
  Future<GuardianCase?> loadOpenCase() async {
    if (_blocked) return null;

    try {
      final res = await http.get(
        ConsoleConfig.caseEndpoint,
        headers: {
          'Authorization': 'Bearer ${PhoneIdentity.instance.accessToken}',
        },
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode != 200) return null;

      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final c = body['case'];
      if (c == null) return null;
      return GuardianCase.fromJson(c as Map<String, dynamic>);
    } on SocketException {
      return null;
    } on TimeoutException {
      return null;
    } on http.ClientException {
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Tells the console the user is safe and closes their case.
  ///
  /// Returns false if it did not land, so the UI can keep the banner up rather
  /// than claim an all-clear that never reached anybody. Getting this wrong in
  /// the optimistic direction means a rescue is called off by a message that
  /// was never delivered.
  Future<bool> markSafe() async {
    if (_blocked) return false;

    try {
      final res = await http.post(
        ConsoleConfig.caseEndpoint,
        headers: {
          'Authorization': 'Bearer ${PhoneIdentity.instance.accessToken}',
        },
      ).timeout(const Duration(seconds: 10));

      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
