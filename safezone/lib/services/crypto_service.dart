import 'dart:convert';
import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Handles AES-256 encryption of sensitive files (passport image).
/// The AES key is generated once and kept in the OS secure keystore,
/// never hard-coded and never written to normal storage.
class CryptoService {
  CryptoService._();
  static final CryptoService instance = CryptoService._();

  static const _keyName = 'safezone_aes_key';
  final _storage = const FlutterSecureStorage();

  Future<enc.Key> _getKey() async {
    String? b64 = await _storage.read(key: _keyName);
    if (b64 == null) {
      final key = enc.Key.fromSecureRandom(32); // 256-bit
      b64 = base64Encode(key.bytes);
      await _storage.write(key: _keyName, value: b64);
      return key;
    }
    return enc.Key(base64Decode(b64));
  }

  /// Returns IV (16 bytes) + ciphertext.
  Future<Uint8List> encryptBytes(Uint8List data) async {
    final key = await _getKey();
    final iv = enc.IV.fromSecureRandom(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final encrypted = encrypter.encryptBytes(data, iv: iv);
    final out = BytesBuilder();
    out.add(iv.bytes);
    out.add(encrypted.bytes);
    return out.toBytes();
  }

  /// Expects IV (16 bytes) + ciphertext.
  Future<Uint8List> decryptBytes(Uint8List data) async {
    final key = await _getKey();
    final iv = enc.IV(Uint8List.fromList(data.sublist(0, 16)));
    final cipher = data.sublist(16);
    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final decrypted = encrypter.decryptBytes(enc.Encrypted(cipher), iv: iv);
    return Uint8List.fromList(decrypted);
  }
}
