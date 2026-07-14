import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import 'auth_service.dart';
import 'contact_store.dart';
import 'phone_identity.dart';
import 'profile_store.dart';

/// Pushes the user's identity and trusted-contact list up to the console.
///
/// Every method here is **best-effort and silent**. A failed sync must never
/// block the UI or surface an error: the local list keeps working, and SOS over
/// SMS — the channel that needs no network — is entirely unaffected. Syncing
/// only *adds* the console case and the Guardian tab.
class ProfileSync {
  ProfileSync._();
  static final ProfileSync instance = ProfileSync._();

  /// True when there is a verified identity and somewhere to send it.
  Future<bool> get _canSync async {
    // Never sync from a coerced session — it would upload the real identity
    // while the attacker watches an empty decoy vault.
    if (AuthService.instance.isDecoy) return false;
    if (!ConsoleConfig.isConfigured) return false;
    if (PhoneIdentity.instance.accessToken == null) return false;
    final p = await ProfileStore.instance.load();
    return p != null && p.phoneVerified;
  }

  /// Upserts the citizen record, then the contact set. Contacts depend on the
  /// citizen existing, so the order matters.
  Future<bool> syncAll() async {
    if (!await _canSync) return false;
    final ok = await syncProfile();
    if (!ok) return false;
    return syncContacts();
  }

  Future<bool> syncProfile() async {
    if (!await _canSync) return false;
    final profile = (await ProfileStore.instance.load())!;
    return _send(
      ConsoleConfig.profileEndpoint,
      {'passportNo': profile.passportNo, 'fullName': profile.fullName},
    );
  }

  /// Whole-set replace: a partially-synced emergency contact list is worse than
  /// a late one, and replace is idempotent so a retry after being offline is
  /// always safe.
  Future<bool> syncContacts() async {
    if (!await _canSync) return false;
    final profile = (await ProfileStore.instance.load())!;
    final contacts = await ContactStore.instance.loadContacts();
    return _send(ConsoleConfig.contactsEndpoint, {
      'passportNo': profile.passportNo,
      'contacts': contacts
          .map((c) => {'name': c.name, 'phone': c.phone, 'email': c.email})
          .toList(),
    });
  }

  Future<bool> _send(Uri url, Map<String, dynamic> body) async {
    final token = PhoneIdentity.instance.accessToken;
    if (token == null) return false;
    try {
      final res = await http
          .put(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      return res.statusCode == 200;
    } on SocketException {
      return false; // Offline. Next successful sync replaces the whole set.
    } on TimeoutException {
      return false;
    } on http.ClientException {
      return false;
    } catch (_) {
      return false;
    }
  }
}
