/// Test-only bypass for phone verification.
///
/// The dev Supabase project has no SMS provider ("Unsupported phone provider"),
/// so [PhoneIdentity.sendCode] throws and no phone can ever be verified — which
/// blocks profile sync, journey sharing, and the Guardian map end to end.
///
/// When [enabled] (build with `--dart-define=TEST_MODE=true`), [PhoneIdentity]
/// skips Supabase entirely: any code verifies, and the bearer it hands the
/// console becomes the sentinel `test:<phone>`. The console must independently
/// opt in (`APP_AUTH_TEST_MODE=1`) before it will honour that sentinel, so a
/// TEST_MODE build talking to a real console is still rejected — the bypass
/// only exists where both ends agree.
///
/// Defaults to false. Never ship a build with this on.
class TestMode {
  const TestMode._();

  static const bool enabled = bool.fromEnvironment(
    'TEST_MODE',
    defaultValue: false,
  );

  /// Bearer prefix the console recognises in test mode; the verified phone
  /// (E.164, leading '+') follows it, e.g. `test:+85620...`.
  static const String bearerPrefix = 'test:';
}
