import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/utils/mrz_parser.dart';

// The ICAO 9303 specimen passport (Utopia / Anna Maria Eriksson) — the
// published reference MRZ with known-valid check digits.
const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
const line2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

void main() {
  test('parses the ICAO specimen', () {
    final mrz = MrzParser.parse([line1, line2]);
    expect(mrz, isNotNull);
    expect(mrz!.passportNo, 'L898902C3');
    expect(mrz.surname, 'ERIKSSON');
    expect(mrz.givenNames, 'ANNA MARIA');
    expect(mrz.fullName, 'ANNA MARIA ERIKSSON');
    expect(mrz.nationality, 'UTO');
    expect(mrz.sex, 'F');
    expect(mrz.birthDate, '740812');
    expect(mrz.expiryDate, '120415');
    expect(mrz.checksPass, isTrue);
  });

  test('ignores surrounding non-MRZ text from the photo page', () {
    final mrz = MrzParser.parse([
      'PASSPORT',
      'REPUBLIC OF UTOPIA',
      'ERIKSSON, ANNA MARIA',
      line1,
      line2,
      '12 AUG 1974',
    ]);
    expect(mrz, isNotNull);
    expect(mrz!.passportNo, 'L898902C3');
  });

  test('repairs letter-for-digit OCR confusions in numeric fields', () {
    // OCR read the birth date's zeros as the letter O: 74O812.
    final smudged = line2.replaceRange(13, 19, '74O812');
    final mrz = MrzParser.parse([line1, smudged]);
    expect(mrz, isNotNull);
    expect(mrz!.birthDate, '740812');
    expect(mrz.checksPass, isTrue);
  });

  test('a failed check digit is flagged, not hidden', () {
    // Corrupt the passport-number check digit (6 → 5).
    final corrupt = line2.replaceRange(9, 10, '5');
    final mrz = MrzParser.parse([line1, corrupt]);
    expect(mrz, isNotNull);
    expect(mrz!.checksPass, isFalse);
    // The read itself is still offered for the user to correct.
    expect(mrz.passportNo, 'L898902C3');
  });

  test('OCR spaces inside the zone are stripped before parsing', () {
    final mrz = MrzParser.parse(['${line1.substring(0, 20)} '
        '${line1.substring(20)}', line2]);
    expect(mrz, isNotNull);
    expect(mrz!.fullName, 'ANNA MARIA ERIKSSON');
  });

  test('returns null when the photo has no MRZ', () {
    expect(MrzParser.parse(['REPUBLIC OF UTOPIA', 'ANNA MARIA']), isNull);
    expect(MrzParser.parse([]), isNull);
  });
}
