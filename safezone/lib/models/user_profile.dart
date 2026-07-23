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

  /// Date of birth as printed in the passport MRZ (YYMMDD); '' when unknown.
  /// Filled by the OCR autofill on the Passport screen — a plain read of the
  /// document, never entered here by hand.
  final String birthDate;

  /// Passport expiry as printed in the MRZ (YYMMDD, always a 20xx date); ''
  /// when unknown.
  final String expiryDate;

  /// 'M', 'F', or '' when unspecified — mirrors [MrzData.sex].
  final String sex;

  const UserProfile({
    required this.fullName,
    required this.passportNo,
    required this.phone,
    this.phoneVerified = false,
    this.birthDate = '',
    this.expiryDate = '',
    this.sex = '',
  });

  UserProfile copyWith({
    String? fullName,
    String? passportNo,
    String? phone,
    bool? phoneVerified,
    String? birthDate,
    String? expiryDate,
    String? sex,
  }) =>
      UserProfile(
        fullName: fullName ?? this.fullName,
        passportNo: passportNo ?? this.passportNo,
        phone: phone ?? this.phone,
        phoneVerified: phoneVerified ?? this.phoneVerified,
        birthDate: birthDate ?? this.birthDate,
        expiryDate: expiryDate ?? this.expiryDate,
        sex: sex ?? this.sex,
      );

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'passportNo': passportNo,
        'phone': phone,
        'phoneVerified': phoneVerified,
        'birthDate': birthDate,
        'expiryDate': expiryDate,
        'sex': sex,
      };

  // The three MRZ fields default to '' so a profile stored before they existed
  // still loads — a missing key is simply "not read yet", not an error.
  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        fullName: j['fullName'] as String,
        passportNo: j['passportNo'] as String,
        phone: j['phone'] as String,
        phoneVerified: j['phoneVerified'] as bool? ?? false,
        birthDate: j['birthDate'] as String? ?? '',
        expiryDate: j['expiryDate'] as String? ?? '',
        sex: j['sex'] as String? ?? '',
      );
}
