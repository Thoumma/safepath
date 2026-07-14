import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'crypto_service.dart';

/// Saves the passport image ONLY in encrypted form on disk.
/// The plaintext image lives only in memory while in use.
class PassportStore {
  PassportStore._();
  static final PassportStore instance = PassportStore._();

  static const _fileName = 'passport.enc';

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/$_fileName');
  }

  Future<void> savePassport(Uint8List plainBytes) async {
    final encrypted = await CryptoService.instance.encryptBytes(plainBytes);
    final f = await _file();
    await f.writeAsBytes(encrypted, flush: true);
  }

  Future<Uint8List?> loadPassport() async {
    final f = await _file();
    if (!await f.exists()) return null;
    final encrypted = await f.readAsBytes();
    return CryptoService.instance.decryptBytes(encrypted);
  }

  Future<bool> hasPassport() async => (await _file()).exists();

  /// Writes a temporary decrypted file for sharing, returns its path.
  Future<String?> exportDecryptedTemp() async {
    final bytes = await loadPassport();
    if (bytes == null) return null;
    final dir = await getTemporaryDirectory();
    final out = File('${dir.path}/passport_share.jpg');
    await out.writeAsBytes(bytes, flush: true);
    return out.path;
  }

  /// Clears any temporary decrypted files written for sharing.
  Future<void> clearTempFiles() async {
    try {
      final dir = await getTemporaryDirectory();
      final tempFile = File('${dir.path}/passport_share.jpg');
      if (await tempFile.exists()) {
        await tempFile.delete();
      }
    } catch (_) {
      // Fail silently to avoid interrupting the main flow
    }
  }
}
