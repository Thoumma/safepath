/// Parses the MRZ (machine-readable zone) of a TD3 travel document — the two
/// 44-character OCR-B lines at the bottom of a passport's photo page:
///
///   P<LAOSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<
///   PA1234567 8LAO 900101 7 F 300101 5 <peronal-no> <final>
///
/// Line 2 carries the passport number, nationality, birth date, sex and expiry,
/// each guarded by an ICAO 9303 check digit (weights 7-3-1), so a misread is
/// detectable rather than silently wrong. Pure Dart, no platform channels —
/// the OCR layer lives in `services/passport_ocr.dart`.
class MrzData {
  final String passportNo;
  final String surname;
  final String givenNames;
  final String nationality; // ISO 3166-1 alpha-3, e.g. LAO
  final String sex; // 'M', 'F' or '' when unspecified

  /// YYMMDD as printed in the zone; may be empty if unreadable.
  final String birthDate;
  final String expiryDate;

  /// True when every check digit matched. When false the fields are still the
  /// best available read, but the user must confirm them before saving.
  final bool checksPass;

  const MrzData({
    required this.passportNo,
    required this.surname,
    required this.givenNames,
    required this.nationality,
    required this.sex,
    required this.birthDate,
    required this.expiryDate,
    required this.checksPass,
  });

  /// "GIVEN SURNAME", the order people write their own name.
  String get fullName =>
      [givenNames, surname].where((s) => s.isNotEmpty).join(' ');
}

class MrzParser {
  MrzParser._();

  /// OCR confusions worth fixing in positions that must be digits.
  static const _toDigit = {
    'O': '0', 'Q': '0', 'D': '0',
    'I': '1', 'L': '1',
    'Z': '2',
    'S': '5',
    'B': '8',
    'G': '6',
  };

  /// Finds and parses the MRZ in raw OCR [lines]. Returns null when no
  /// plausible zone is present (e.g. the photo missed the bottom of the page).
  static MrzData? parse(List<String> lines) {
    // OCR may split or pad the zone: normalise to uppercase, strip everything
    // that cannot appear in an MRZ, and keep only lines close to 44 chars.
    final candidates = <String>[];
    for (final raw in lines) {
      final cleaned =
          raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9<]'), '');
      if (cleaned.length >= 40 && cleaned.length <= 46) {
        candidates.add(_padTo44(cleaned));
      }
    }
    if (candidates.length < 2) return null;

    // Line 1 of a passport starts with 'P'; line 2 follows it.
    for (var i = 0; i < candidates.length - 1; i++) {
      if (candidates[i].startsWith('P')) {
        final parsed = _parseTd3(candidates[i], candidates[i + 1]);
        if (parsed != null) return parsed;
      }
    }
    return null;
  }

  static String _padTo44(String s) =>
      s.length >= 44 ? s.substring(0, 44) : s.padRight(44, '<');

  static MrzData? _parseTd3(String line1, String line2) {
    // ---- line 1: P < issuing-state(3) names(39) ----
    final nameField = line1.substring(5);
    final nameParts = nameField.split('<<');
    final surname = _deFiller(nameParts[0]);
    final given = nameParts.length > 1 ? _deFiller(nameParts[1]) : '';
    if (surname.isEmpty) return null;

    // ---- line 2, fixed columns per ICAO 9303 part 4 ----
    final passportNo = _deFiller(line2.substring(0, 9));
    final passportCheck = _digitAt(line2, 9);
    final nationality = _deFiller(line2.substring(10, 13));
    final birth = _digits(line2.substring(13, 19));
    final birthCheck = _digitAt(line2, 19);
    final sexRaw = line2[20];
    final expiry = _digits(line2.substring(21, 27));
    final expiryCheck = _digitAt(line2, 27);

    if (passportNo.isEmpty) return null;

    final checksPass =
        _checkDigit(line2.substring(0, 9)) == passportCheck &&
            _checkDigit(_digits(line2.substring(13, 19))) == birthCheck &&
            _checkDigit(_digits(line2.substring(21, 27))) == expiryCheck;

    return MrzData(
      passportNo: passportNo,
      surname: surname,
      givenNames: given,
      nationality: nationality,
      sex: (sexRaw == 'M' || sexRaw == 'F') ? sexRaw : '',
      birthDate: birth,
      expiryDate: expiry,
      checksPass: checksPass,
    );
  }

  /// '<' fillers become spaces; runs collapse ("ANNA<MARIA" → "ANNA MARIA").
  static String _deFiller(String s) =>
      s.replaceAll('<', ' ').replaceAll(RegExp(r'\s+'), ' ').trim();

  /// Repairs letter/digit OCR confusions in a field that must be numeric.
  static String _digits(String s) =>
      s.split('').map((c) => _toDigit[c] ?? c).join();

  static int _digitAt(String s, int i) {
    final c = _digits(s[i]);
    return int.tryParse(c) ?? -1;
  }

  /// ICAO 9303 check digit: values (0-9, A=10…Z=35, '<'=0) weighted 7,3,1.
  static int _checkDigit(String field) {
    const weights = [7, 3, 1];
    var sum = 0;
    for (var i = 0; i < field.length; i++) {
      final c = field.codeUnitAt(i);
      int value;
      if (c >= 0x30 && c <= 0x39) {
        value = c - 0x30; // 0-9
      } else if (c >= 0x41 && c <= 0x5A) {
        value = c - 0x41 + 10; // A-Z
      } else {
        value = 0; // '<'
      }
      sum += value * weights[i % 3];
    }
    return sum % 10;
  }
}
