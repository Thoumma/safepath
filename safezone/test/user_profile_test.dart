import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/models/user_profile.dart';

// The MRZ-derived fields (birthDate/expiryDate/sex) must round-trip through
// storage and survive edits that don't mention them — the whole point of #4 is
// that a passport scan's data is no longer discarded.
void main() {
  const full = UserProfile(
    fullName: 'ANNA MARIA ERIKSSON',
    passportNo: 'L898902C3',
    phone: '+85620123456',
    phoneVerified: true,
    birthDate: '740812',
    expiryDate: '120415',
    sex: 'F',
  );

  test('the MRZ fields survive a JSON round-trip', () {
    final restored =
        UserProfile.fromJson(jsonDecode(jsonEncode(full.toJson())));
    expect(restored.birthDate, '740812');
    expect(restored.expiryDate, '120415');
    expect(restored.sex, 'F');
    // And the pre-existing fields are unchanged.
    expect(restored.fullName, 'ANNA MARIA ERIKSSON');
    expect(restored.passportNo, 'L898902C3');
    expect(restored.phone, '+85620123456');
    expect(restored.phoneVerified, isTrue);
  });

  test('a profile stored before these fields existed still loads', () {
    // No birthDate/expiryDate/sex keys — the shape written by the old app.
    final legacy = UserProfile.fromJson({
      'fullName': 'SOMSAK',
      'passportNo': 'PA1234567',
      'phone': '+8562099',
      'phoneVerified': false,
    });
    expect(legacy.birthDate, '');
    expect(legacy.expiryDate, '');
    expect(legacy.sex, '');
    expect(legacy.fullName, 'SOMSAK');
  });

  test('copyWith preserves the MRZ fields when only the phone changes', () {
    // This is the profile-screen re-verify path: it must not wipe the scan.
    final edited = full.copyWith(phone: '+85620999999', phoneVerified: false);
    expect(edited.birthDate, '740812');
    expect(edited.expiryDate, '120415');
    expect(edited.sex, 'F');
    expect(edited.phone, '+85620999999');
    expect(edited.phoneVerified, isFalse);
  });

  test('copyWith overwrites an MRZ field only when a new value is given', () {
    final rescanned =
        full.copyWith(birthDate: '900101', expiryDate: '300101', sex: 'M');
    expect(rescanned.birthDate, '900101');
    expect(rescanned.expiryDate, '300101');
    expect(rescanned.sex, 'M');
  });

  test('the fields default to empty on a minimal profile', () {
    const minimal =
        UserProfile(fullName: 'X', passportNo: 'P1', phone: '');
    expect(minimal.birthDate, '');
    expect(minimal.expiryDate, '');
    expect(minimal.sex, '');
    expect(minimal.toJson()['birthDate'], '');
  });
}
