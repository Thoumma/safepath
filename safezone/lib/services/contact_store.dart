import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/trusted_contact.dart';

/// Stores the list of trusted (emergency) contacts in the OS secure keystore.
///
/// Contacts are PII, so they stay in `flutter_secure_storage` (encrypted)
/// rather than plaintext SQLite.
class ContactStore {
  ContactStore._();
  static final ContactStore instance = ContactStore._();

  static const _key = 'trusted_contacts';
  static const _legacyKey = 'trusted_contact'; // pre multi-contact single entry
  final _storage = const FlutterSecureStorage();

  /// Returns all trusted contacts (empty list if none). Transparently migrates
  /// a legacy single-contact entry into the new list on first read.
  Future<List<TrustedContact>> loadContacts() async {
    final raw = await _storage.read(key: _key);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => TrustedContact.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    final legacy = await _storage.read(key: _legacyKey);
    if (legacy != null) {
      final c =
          TrustedContact.fromJson(jsonDecode(legacy) as Map<String, dynamic>);
      await _save([c]);
      await _storage.delete(key: _legacyKey);
      return [c];
    }

    return [];
  }

  Future<void> addContact(TrustedContact c) async {
    final list = await loadContacts();
    list.add(c);
    await _save(list);
  }

  Future<void> removeAt(int index) async {
    final list = await loadContacts();
    if (index >= 0 && index < list.length) {
      list.removeAt(index);
      await _save(list);
    }
  }

  /// Convenience for callers that only need to know if any contact exists.
  Future<TrustedContact?> primaryContact() async {
    final list = await loadContacts();
    return list.isEmpty ? null : list.first;
  }

  Future<void> _save(List<TrustedContact> contacts) async {
    await _storage.write(
      key: _key,
      value: jsonEncode(contacts.map((c) => c.toJson()).toList()),
    );
  }
}
