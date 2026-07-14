/// Supabase connection details for the SOS server channel.
///
/// The publishable key is public by design — it ships inside the APK and is
/// meant to be readable. It is safe here because `sos_events` is write-only
/// under RLS: this key can insert a location, but cannot read one back (see
/// safezone-console/supabase/rls_policies.sql). Never put the *secret* key in
/// the app.
///
/// Both values can be overridden at build time without touching source:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=...
class SupabaseConfig {
  const SupabaseConfig._();

  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://qsfubvhcbyemmpxqoalw.supabase.co',
  );

  static const String publishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_nxtfLfryLfGYfppF2hTqLg_kqn0gdwF',
  );

  /// False when the app was built without credentials, which makes the server
  /// channel report `notConfigured` instead of failing.
  static bool get isConfigured => url.isNotEmpty && publishableKey.isNotEmpty;
}
