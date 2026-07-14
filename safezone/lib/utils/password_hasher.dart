import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';

/// A salt+hash pair, both base64-encoded, for storage.
class HashedSecret {
  final String salt;
  final String hash;
  const HashedSecret(this.salt, this.hash);
}

/// PBKDF2-HMAC-SHA256 password/OTP hashing built on `package:crypto`.
///
/// We never store passwords or OTP codes in plaintext — only a per-record
/// random salt and the derived key. Verification is constant-time.
class PasswordHasher {
  PasswordHasher._();

  static const int _iterations = 12000;
  static const int _saltBytes = 16;
  static const int _keyBytes = 32; // 256-bit derived key

  static final Random _rng = Random.secure();

  /// Hashes [secret] with a fresh random salt.
  static HashedSecret hash(String secret) {
    final salt = _randomBytes(_saltBytes);
    final derived = _pbkdf2(utf8.encode(secret), salt, _iterations, _keyBytes);
    return HashedSecret(base64Encode(salt), base64Encode(derived));
  }

  /// Constant-time check of [secret] against a stored [salt]/[expectedHash].
  static bool verify(String secret, String salt, String expectedHash) {
    final saltBytes = base64Decode(salt);
    final expected = base64Decode(expectedHash);
    final derived =
        _pbkdf2(utf8.encode(secret), saltBytes, _iterations, expected.length);
    return _constantTimeEquals(derived, expected);
  }

  static Uint8List _randomBytes(int n) {
    final b = Uint8List(n);
    for (var i = 0; i < n; i++) {
      b[i] = _rng.nextInt(256);
    }
    return b;
  }

  static Uint8List _pbkdf2(
      List<int> password, List<int> salt, int iterations, int keyLen) {
    final hmac = Hmac(sha256, password);
    final blockCount = (keyLen / 32).ceil();
    final out = BytesBuilder();

    for (var block = 1; block <= blockCount; block++) {
      // INT_32_BE(block)
      final blockIndex = Uint8List(4)
        ..[0] = (block >> 24) & 0xff
        ..[1] = (block >> 16) & 0xff
        ..[2] = (block >> 8) & 0xff
        ..[3] = block & 0xff;

      var u = hmac.convert([...salt, ...blockIndex]).bytes;
      final t = Uint8List.fromList(u);
      for (var i = 1; i < iterations; i++) {
        u = hmac.convert(u).bytes;
        for (var j = 0; j < t.length; j++) {
          t[j] ^= u[j];
        }
      }
      out.add(t);
    }

    return out.toBytes().sublist(0, keyLen);
  }

  static bool _constantTimeEquals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff == 0;
  }
}
