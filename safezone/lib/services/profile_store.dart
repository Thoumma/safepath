import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user_profile.dart';

/// Stores the user's own identity in the OS secure keystore.
///
/// A passport number and phone number are PII, so this follows [ContactStore]
/// rather than [DatabaseService]: plaintext SQLite is for password hashes and
/// device keys, never for identifying data.
class ProfileStore {
  ProfileStore._();
  static final ProfileStore instance = ProfileStore._();

  static const _key = 'user_profile';
  final _storage = const FlutterSecureStorage();

  UserProfile? _cached;

  /// Null when the user has not filled in a profile yet — a normal state, not
  /// an error. Callers must degrade rather than fail.
  Future<UserProfile?> load() async {
    if (_cached != null) return _cached;
    final raw = await _storage.read(key: _key);
    if (raw == null) return null;
    _cached = UserProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    return _cached;
  }

  Future<void> save(UserProfile profile) async {
    _cached = profile;
    await _storage.write(key: _key, value: jsonEncode(profile.toJson()));
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _key);
  }

  /// Convenience for the many callers that only care whether the server
  /// channel and the Guardian tab can work at all.
  Future<bool> get hasVerifiedPhone async =>
      (await load())?.phoneVerified ?? false;
}
