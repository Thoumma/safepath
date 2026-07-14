/// Where the Response Console lives.
///
/// The app POSTs an SOS to `{baseUrl}/api/sos`, which upserts the citizen and
/// opens a case in the duty officer's inbox.
///
/// **This must be a publicly reachable URL.** A phone cannot resolve
/// `localhost:3000` — that address means the phone itself. For local testing,
/// use the dev machine's LAN IP (e.g. `http://192.168.1.20:3000`) with both
/// devices on the same network; for anything else, deploy the console.
///
/// Override at build time without touching source:
///   flutter run --dart-define=CONSOLE_URL=https://safezone-console.vercel.app
class ConsoleConfig {
  const ConsoleConfig._();

  static const String baseUrl = String.fromEnvironment(
    'CONSOLE_URL',
    defaultValue: '',
  );

  /// False when the app was built without a console URL. The server channel
  /// then reports `notConfigured` instead of failing — SOS still goes out over
  /// SMS, which is the channel that matters when there is no network at all.
  static bool get isConfigured => baseUrl.isNotEmpty;

  static Uri get sosEndpoint => Uri.parse('$baseUrl/api/sos');
  static Uri get profileEndpoint => Uri.parse('$baseUrl/api/me/profile');
  static Uri get contactsEndpoint => Uri.parse('$baseUrl/api/me/contacts');
  static Uri get guardiansEndpoint => Uri.parse('$baseUrl/api/me/guardians');

  /// GET = the user's own open case; POST = "I'm safe", resolve it.
  static Uri get caseEndpoint => Uri.parse('$baseUrl/api/me/case');
}
