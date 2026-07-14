/// Someone who made *you* their trusted contact.
///
/// The mirror image of a [TrustedContact]: that is a person you would call for
/// help; this is a person who would call you.
class Guardian {
  final String citizenId;
  final String fullName;
  final String? phone;
  final String? relation;

  /// True when they currently have an open case — they pressed SOS and nobody
  /// has resolved it yet.
  final bool inEmergency;

  final GuardianCase? activeCase;

  const Guardian({
    required this.citizenId,
    required this.fullName,
    this.phone,
    this.relation,
    required this.inEmergency,
    this.activeCase,
  });

  factory Guardian.fromJson(Map<String, dynamic> j) => Guardian(
        citizenId: j['citizenId'] as String,
        fullName: j['fullName'] as String,
        phone: j['phone'] as String?,
        relation: j['relation'] as String?,
        inEmergency: j['inEmergency'] as bool? ?? false,
        activeCase: j['case'] == null
            ? null
            : GuardianCase.fromJson(j['case'] as Map<String, dynamic>),
      );
}

class GuardianCase {
  final String refNo;
  final String severity;
  final String status;
  final String type;
  final double? lat;
  final double? lng;
  final String? city;
  final String? country;
  final DateTime createdAt;

  const GuardianCase({
    required this.refNo,
    required this.severity,
    required this.status,
    required this.type,
    this.lat,
    this.lng,
    this.city,
    this.country,
    required this.createdAt,
  });

  bool get hasLocation => lat != null && lng != null;

  String get mapsUrl => 'https://maps.google.com/?q=$lat,$lng';

  factory GuardianCase.fromJson(Map<String, dynamic> j) => GuardianCase(
        refNo: j['refNo'] as String,
        severity: j['severity'] as String,
        status: j['status'] as String,
        type: j['type'] as String,
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
        city: j['city'] as String?,
        country: j['country'] as String?,
        createdAt: DateTime.parse(j['createdAt'] as String).toLocal(),
      );
}
