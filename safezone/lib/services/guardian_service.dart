import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import '../models/guardian.dart';
import 'auth_service.dart';
import 'phone_identity.dart';

/// Why the Guardian list is empty. The screen needs to tell these apart: "you
/// have not verified your number" is a step the user can take; "nobody has
/// added you" is not a problem at all; "no signal" is neither.
enum GuardianState { ok, needsVerification, offline, failed }

class GuardianResult {
  final GuardianState state;
  final List<Guardian> guardians;
  const GuardianResult(this.state, [this.guardians = const []]);
}

/// Loads the people who made the user their trusted contact.
class GuardianService {
  GuardianService._();
  static final GuardianService instance = GuardianService._();

  Future<GuardianResult> load() async {
    // ── Duress gate. Do not move, do not weaken. ────────────────────────────
    //
    // In decoy mode the user was coerced into unlocking with their fake
    // password and an attacker is holding the phone. The decoy vault hides
    // their passport — but this list would hand over their real social graph:
    // everyone who depends on them, and, for anyone mid-emergency, that
    // person's live location. That is a worse leak than the passport the decoy
    // was built to protect.
    //
    // Return empty *before* touching the network, so not even a request is
    // observable. `GuardianState.ok` — not a special state — because the screen
    // must render an ordinary "nobody has added you" empty state. Any wording
    // that hints something is being withheld is a tell, and a tell is the whole
    // vulnerability.
    if (AuthService.instance.isDecoy) {
      return const GuardianResult(GuardianState.ok);
    }

    if (!ConsoleConfig.isConfigured) {
      return const GuardianResult(GuardianState.needsVerification);
    }

    final token = PhoneIdentity.instance.accessToken;
    if (token == null || !PhoneIdentity.instance.isVerified) {
      return const GuardianResult(GuardianState.needsVerification);
    }

    try {
      final res = await http.get(
        ConsoleConfig.guardiansEndpoint,
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 401 || res.statusCode == 403) {
        return const GuardianResult(GuardianState.needsVerification);
      }
      if (res.statusCode != 200) {
        return const GuardianResult(GuardianState.failed);
      }

      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final list = (body['guardians'] as List<dynamic>)
          .map((e) => Guardian.fromJson(e as Map<String, dynamic>))
          .toList();
      return GuardianResult(GuardianState.ok, list);
    } on SocketException {
      return const GuardianResult(GuardianState.offline);
    } on TimeoutException {
      return const GuardianResult(GuardianState.offline);
    } on http.ClientException {
      return const GuardianResult(GuardianState.offline);
    } catch (_) {
      return const GuardianResult(GuardianState.failed);
    }
  }
}
