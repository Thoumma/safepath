// Verifies the TEST_MODE phone-verification bypass — the simulation the app
// runs at the hackathon, where the dev Supabase project has no SMS provider.
//
// Run with the flag on (the bypass is a compile-time const, off by default):
//   flutter test --dart-define=TEST_MODE=true test/phone_identity_testmode_test.dart
//
// These never touch Supabase: in TEST_MODE every getter short-circuits before
// reaching Supabase.instance, so the suite runs without initialising it.

import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/config/test_mode.dart';
import 'package:safezone/services/phone_identity.dart';

void main() {
  // This suite only means anything with the compile-time flag on. Under a plain
  // `flutter test` the bypass is off, so skip cleanly instead of failing — CI
  // stays green, and the real run is `--dart-define=TEST_MODE=true`.
  if (!TestMode.enabled) {
    test('TEST_MODE simulation — skipped (pass --dart-define=TEST_MODE=true)',
        () {}, skip: true);
    return;
  }

  test('verifyCode accepts any code and marks the phone verified', () async {
    final pi = PhoneIdentity.instance;
    final ok = await pi.verifyCode('+8562011112222', '000000');

    expect(ok, isTrue);
    expect(pi.isVerified, isTrue);
    expect(pi.verifiedPhone, '+8562011112222');
    // The sentinel bearer the console recognises under APP_AUTH_TEST_MODE.
    expect(pi.accessToken, 'test:+8562011112222');
  });

  test('a number typed without + is normalised to E.164', () async {
    final pi = PhoneIdentity.instance;
    await pi.verifyCode('8562033334444', '123456');

    expect(pi.verifiedPhone, '+8562033334444');
    expect(pi.accessToken, 'test:+8562033334444');
  });

  test('sendCode is a no-op — no SMS provider is contacted', () async {
    // Must not throw despite there being no configured provider / session.
    await PhoneIdentity.instance.sendCode('+8562011112222');
  });
}
