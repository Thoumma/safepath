import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sqflite/sqflite.dart';
import 'database_service.dart';

/// Identifies this installation with a stable random device key kept in secure
/// storage, and tracks which device keys are "known" (trusted) in SQLite.
///
/// A fresh install / cleared key produces an unknown device, which the auth
/// flow gates behind an OTP approved by the trusted contact.
class DeviceIdentity {
  DeviceIdentity._();
  static final DeviceIdentity instance = DeviceIdentity._();

  static const _keyName = 'safezone_device_key';
  final _storage = const FlutterSecureStorage();
  static final Random _rng = Random.secure();

  /// Test seam: fixed device key so tests never touch secure storage.
  static String? testKeyOverride;

  /// Returns this device's key, generating and persisting one if absent.
  Future<String> currentKey() async {
    if (testKeyOverride != null) return testKeyOverride!;
    var key = await _storage.read(key: _keyName);
    if (key == null) {
      key = _randomHex(16);
      await _storage.write(key: _keyName, value: key);
    }
    return key;
  }

  Future<bool> isKnown() async {
    final key = await currentKey();
    final db = await DatabaseService.instance.db;
    final rows = await db.query(
      'known_devices',
      where: 'device_key = ?',
      whereArgs: [key],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  /// Registers this device as known (or refreshes its last-login time).
  Future<void> register({String? label}) async {
    final key = await currentKey();
    final db = await DatabaseService.instance.db;
    final now = DateTime.now().millisecondsSinceEpoch;
    await db.insert(
      'known_devices',
      {
        'device_key': key,
        'label': label,
        'created_at': now,
        'last_login_at': now,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }


  static String _randomHex(int bytes) {
    final sb = StringBuffer();
    for (var i = 0; i < bytes; i++) {
      sb.write(_rng.nextInt(256).toRadixString(16).padLeft(2, '0'));
    }
    return sb.toString();
  }
}
