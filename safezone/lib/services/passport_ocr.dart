import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../utils/mrz_parser.dart';

/// Reads the MRZ off a passport photo with on-device ML Kit text recognition.
///
/// On-device is non-negotiable here: the photo of a passport must never leave
/// the phone for OCR, and the reader has to work abroad on a dead SIM — same
/// reasons the fonts are bundled. Recognition is Android/iOS only; on other
/// platforms (and on any failure) [readMrz] returns null and the caller
/// degrades to manual entry.
class PassportOcr {
  PassportOcr._();
  static final PassportOcr instance = PassportOcr._();

  /// Returns the parsed MRZ, or null when none was found or OCR is
  /// unavailable. Never throws — autofill is a convenience, not a step the
  /// vault flow may fail on.
  Future<MrzData?> readMrz(String imagePath) async {
    TextRecognizer? recognizer;
    try {
      recognizer = TextRecognizer(script: TextRecognitionScript.latin);
      final result =
          await recognizer.processImage(InputImage.fromFilePath(imagePath));
      final lines = <String>[
        for (final block in result.blocks)
          for (final line in block.lines) line.text,
      ];
      return MrzParser.parse(lines);
    } catch (_) {
      return null;
    } finally {
      await recognizer?.close();
    }
  }
}
