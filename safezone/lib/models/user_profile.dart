/// Who the user is, as far as the outside world is concerned.
///
/// This is the app's *own* identity — distinct from a [TrustedContact], which
/// is someone else. Until this exists, the Response Console cannot open a case
/// for the user (it keys citizens by passport number) and nobody can be shown
/// as trusting them (the reverse lookup keys on phone number).
///
/// The app works fully without one: SOS still reaches the trusted contact over
/// SMS, which needs no network. A profile only *adds* the server channel, the
/// embassy case, and the Guardian tab.
class UserProfile {
  final String fullName;

  /// Passport number. The Response Console's `Citizen` is keyed on this, so it
  /// is what ties an SOS to a real person a duty officer can act on.
  final String passportNo;

  /// E.164, e.g. +85620xxxxxxxx.
  final String phone;

  /// True only after a real SMS round-trip proved the user owns [phone].
  ///
  /// Load-bearing: the Guardian tab asks "who listed my number?", which is a
  /// social-graph query. Answering it for an *unverified* number would let
  /// anyone type a stranger's number and learn who depends on them. So the
  /// Guardian tab reads this flag, never [phone] alone.
  final bool phoneVerified;

  const UserProfile({
    required this.fullName,
    required this.passportNo,
    required this.phone,
    this.phoneVerified = false,
  });

  UserProfile copyWith({
    String? fullName,
    String? passportNo,
    String? phone,
    bool? phoneVerified,
  }) =>
      UserProfile(
        fullName: fullName ?? this.fullName,
        passportNo: passportNo ?? this.passportNo,
        phone: phone ?? this.phone,
        phoneVerified: phoneVerified ?? this.phoneVerified,
      );

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'passportNo': passportNo,
        'phone': phone,
        'phoneVerified': phoneVerified,
      };

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        fullName: j['fullName'] as String,
        passportNo: j['passportNo'] as String,
        phone: j['phone'] as String,
        phoneVerified: j['phoneVerified'] as bool? ?? false,
      );
}
