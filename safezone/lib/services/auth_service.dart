import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/app_user.dart';
import '../utils/password_hasher.dart';
import 'contact_store.dart';
import 'database_service.dart';
import 'device_identity.dart';
import 'otp_service.dart';
import 'sos_service.dart';

/// Which password unlocked the session.
enum AuthMode { real, fake }

/// Outcome of a password attempt.
enum LoginResult {
  wrongPassword,
  unlockedReal,
  unlockedFakeDecoy,
  needsOtp,
  noContact,
}

/// Central authentication state + orchestration. Singleton `ChangeNotifier`
/// so `GoRouter.refreshListenable` re-runs redirects when auth state changes.
///
/// - Real password unlocks normally.
/// - Fake password unlocks a decoy (empty) vault and fires a best-effort
///   silent SOS to the trusted contact (duress).
/// - A real-password login on an unknown device must be approved with an OTP
///   delivered to the trusted contact.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  bool _isSetup = false;
  bool _isUnlocked = false;
  AuthMode _mode = AuthMode.real;
  AuthMode _pendingMode = AuthMode.real;

  int _failedAttempts = 0;

  bool get isSetup => _isSetup;
  bool get isUnlocked => _isUnlocked;
  AuthMode get mode => _mode;
  bool get isDecoy => _isUnlocked && _mode == AuthMode.fake;
  int get failedAttempts => _failedAttempts;

  /// Loads whether an account already exists. Call once at startup.
  Future<void> loadState() async {
    _isSetup = await _userExists();
    notifyListeners();
  }

  Future<bool> _userExists() async {
    final db = await DatabaseService.instance.db;
    final rows = await db.query('app_user', limit: 1);
    return rows.isNotEmpty;
  }

  Future<AppUser?> _loadUser() async {
    final db = await DatabaseService.instance.db;
    final rows = await db.query('app_user', limit: 1);
    return rows.isEmpty ? null : AppUser.fromMap(rows.first);
  }

  /// First-run account creation. [real] and [fake] must differ.
  Future<void> setup(String real, String fake) async {
    final realHashed = PasswordHasher.hash(real);
    final fakeHashed = PasswordHasher.hash(fake);
    final db = await DatabaseService.instance.db;
    await db.delete('app_user'); // single-account invariant
    await db.insert('app_user', AppUser(
      realHash: realHashed.hash,
      realSalt: realHashed.salt,
      fakeHash: fakeHashed.hash,
      fakeSalt: fakeHashed.salt,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    ).toMap());

    // The setup device is implicitly trusted.
    await DeviceIdentity.instance.register(label: 'setup');
    _isSetup = true;
    notifyListeners();
  }

  /// Attempts to unlock with [password].
  Future<LoginResult> login(String password) async {
    final user = await _loadUser();
    if (user == null) return LoginResult.wrongPassword;

    // Fake password: always straight to decoy + silent alert, even on a new
    // device, so the duress illusion is never broken by an OTP prompt.
    if (PasswordHasher.verify(password, user.fakeSalt, user.fakeHash)) {
      _failedAttempts = 0;
      _unlock(AuthMode.fake);
      unawaited(_fireSilentAlert());
      return LoginResult.unlockedFakeDecoy;
    }

    if (PasswordHasher.verify(password, user.realSalt, user.realHash)) {
      _failedAttempts = 0;
      final known = await DeviceIdentity.instance.isKnown();
      if (known) {
        _unlock(AuthMode.real);
        await DeviceIdentity.instance.register(); // refresh last_login_at
        return LoginResult.unlockedReal;
      }
      // Unknown device → require OTP approval from the trusted contacts.
      final contacts = await ContactStore.instance.loadContacts();
      if (contacts.isEmpty) return LoginResult.noContact;
      _pendingMode = AuthMode.real;
      return LoginResult.needsOtp;
    }

    _failedAttempts++;
    return LoginResult.wrongPassword;
  }

  /// Sends (or resends) the OTP to all trusted contacts. Returns false if no
  /// contact is configured.
  Future<bool> sendOtp() async {
    final contacts = await ContactStore.instance.loadContacts();
    if (contacts.isEmpty) return false;
    await OtpService.instance.generateAndSend(contacts);
    return true;
  }

  /// Verifies the OTP for the pending new-device login; on success registers
  /// the device and unlocks.
  Future<bool> completeOtp(String code) async {
    final ok = await OtpService.instance.verify(code);
    if (!ok) return false;
    await DeviceIdentity.instance.register();
    _unlock(_pendingMode);
    return true;
  }

  void lock() {
    _isUnlocked = false;
    _mode = AuthMode.real;
    notifyListeners();
  }

  void _unlock(AuthMode mode) {
    _mode = mode;
    _isUnlocked = true;
    notifyListeners();
  }

  Future<void> _fireSilentAlert() async {
    try {
      // duress: true raises the console case to CRITICAL so the duty officer
      // knows this person was coerced. It changes nothing on the device — the
      // attacker holding the phone must see an ordinary, empty vault.
      await SosService.instance.triggerSos(duress: true);
    } catch (_) {
      // Best-effort; never surface duress alert failures in the UI.
    }
  }
}
