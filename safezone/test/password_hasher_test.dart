import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/utils/password_hasher.dart';

void main() {
  group('PasswordHasher', () {
    test('verifies the correct password', () {
      final h = PasswordHasher.hash('hunter2');
      expect(PasswordHasher.verify('hunter2', h.salt, h.hash), isTrue);
    });

    test('rejects the wrong password', () {
      final h = PasswordHasher.hash('hunter2');
      expect(PasswordHasher.verify('wrong', h.salt, h.hash), isFalse);
    });

    test('uses a fresh salt each time', () {
      final a = PasswordHasher.hash('same');
      final b = PasswordHasher.hash('same');
      expect(a.salt == b.salt, isFalse);
      expect(a.hash == b.hash, isFalse);
    });

    test('hashes 6-digit OTP codes round-trip', () {
      final h = PasswordHasher.hash('482915');
      expect(PasswordHasher.verify('482915', h.salt, h.hash), isTrue);
      expect(PasswordHasher.verify('482914', h.salt, h.hash), isFalse);
    });
  });
}
