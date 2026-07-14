class TrustedContact {
  final String name;
  final String phone; // E.164, e.g. +85620xxxxxxxx
  final String? email;

  TrustedContact({required this.name, required this.phone, this.email});

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'email': email,
      };

  factory TrustedContact.fromJson(Map<String, dynamic> j) => TrustedContact(
        name: j['name'] as String,
        phone: j['phone'] as String,
        email: j['email'] as String?,
      );
}
