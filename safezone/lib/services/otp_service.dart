import 'dart:math';
import 'package:url_launcher/url_launcher.dart';
import '../models/trusted_contact.dart';
import '../utils/password_hasher.dart';
import 'database_service.dart';
import 'device_identity.dart';

/// Generates a one-time code for new-device logins and delivers it to the
/// trusted contact via the phone's SMS + email composer (no backend).
///
/// Only the PBKDF2 hash of the code is stored; codes are single-use and
/// expire after [_ttl].
class OtpService {
  OtpService._();
  static final OtpService instance = OtpService._();

  static const Duration _ttl = Duration(minutes: 10);
  static final Random _rng = Random.secure();

  /// Test seam for the clock.
  static DateTime Function() now = DateTime.now;

  /// Test seam: disable the SMS/email composers (url_launcher needs platform
  /// channels that don't exist under `flutter test`).
  static bool deliveryEnabled = true;

  /// Generates a 6-digit code, stores its hash, and opens SMS + email
  /// composers addressed to all [contacts]. Returns the plaintext code (so the
  /// owner/contact relays it) — never persisted in plaintext.
  Future<String> generateAndSend(List<TrustedContact> contacts) async {
    final code = (_rng.nextInt(900000) + 100000).toString(); // 100000–999999
    final hashed = PasswordHasher.hash(code);
    final deviceKey = await DeviceIdentity.instance.currentKey();
    final nowMs = now().millisecondsSinceEpoch;

    final db = await DatabaseService.instance.db;
    // Invalidate any earlier pending codes for this device.
    await db.update(
      'otp_codes',
      {'consumed': 1},
      where: 'device_key = ? AND consumed = 0',
      whereArgs: [deviceKey],
    );
    await db.insert('otp_codes', {
      'code_hash': hashed.hash,
      'salt': hashed.salt,
      'device_key': deviceKey,
      'expires_at': nowMs + _ttl.inMilliseconds,
      'consumed': 0,
      'created_at': nowMs,
    });

    if (deliveryEnabled) await _deliver(contacts, code);
    return code;
  }

  /// Verifies [code] against the latest unconsumed, unexpired record and
  /// marks it consumed on success.
  Future<bool> verify(String code) async {
    final deviceKey = await DeviceIdentity.instance.currentKey();
    final nowMs = now().millisecondsSinceEpoch;
    final db = await DatabaseService.instance.db;

    final rows = await db.query(
      'otp_codes',
      where: 'device_key = ? AND consumed = 0 AND expires_at > ?',
      whereArgs: [deviceKey, nowMs],
      orderBy: 'created_at DESC',
      limit: 1,
    );
    if (rows.isEmpty) return false;

    final row = rows.first;
    final ok = PasswordHasher.verify(
      code,
      row['salt'] as String,
      row['code_hash'] as String,
    );
    if (!ok) return false;

    await db.update(
      'otp_codes',
      {'consumed': 1},
      where: 'id = ?',
      whereArgs: [row['id']],
    );
    return true;
  }

  Future<void> _deliver(List<TrustedContact> contacts, String code) async {
    final msg =
        'SafeZone: ລະຫັດຢືນຢັນການເຂົ້າສູ່ລະບົບຈາກອຸປະກອນໃໝ່ແມ່ນ $code (ໝົດອາຍຸໃນ 10 ນາທີ).';

    // One SMS composer addressed to every contact's phone.
    final phones = contacts.map((c) => c.phone).join(',');
    final smsUri = Uri.parse('sms:$phones?body=${Uri.encodeComponent(msg)}');
    if (await canLaunchUrl(smsUri)) {
      await launchUrl(smsUri);
    }

    // One email composer addressed to every contact that has an email.
    final emails = contacts
        .map((c) => c.email)
        .where((e) => e != null && e.isNotEmpty)
        .cast<String>()
        .join(',');
    if (emails.isNotEmpty) {
      final mailUri = Uri(
        scheme: 'mailto',
        path: emails,
        query: 'subject=${Uri.encodeComponent('SafeZone OTP')}'
            '&body=${Uri.encodeComponent(msg)}',
      );
      if (await canLaunchUrl(mailUri)) {
        await launchUrl(mailUri);
      }
    }
  }
}
