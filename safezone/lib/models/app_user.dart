/// The single local account row (passwords stored only as PBKDF2 hashes).
class AppUser {
  final int? id;
  final String realHash;
  final String realSalt;
  final String fakeHash;
  final String fakeSalt;
  final int createdAt;

  AppUser({
    this.id,
    required this.realHash,
    required this.realSalt,
    required this.fakeHash,
    required this.fakeSalt,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        if (id != null) 'id': id,
        'real_hash': realHash,
        'real_salt': realSalt,
        'fake_hash': fakeHash,
        'fake_salt': fakeSalt,
        'created_at': createdAt,
      };

  factory AppUser.fromMap(Map<String, dynamic> m) => AppUser(
        id: m['id'] as int?,
        realHash: m['real_hash'] as String,
        realSalt: m['real_salt'] as String,
        fakeHash: m['fake_hash'] as String,
        fakeSalt: m['fake_salt'] as String,
        createdAt: m['created_at'] as int,
      );
}
