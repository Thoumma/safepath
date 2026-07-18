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

  /// When the latest live GPS fix landed, or null if only the opening SOS point
  /// exists. `lat`/`lng` already track the newest position; this timestamps it
  /// so the screen can show "updated X ago" and a live indicator.
  final DateTime? trackedAt;

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
    this.trackedAt,
  });

  bool get hasLocation => lat != null && lng != null;

  /// True while the position is being refreshed — an open case whose last fix
  /// is recent. Beyond that the phone is off, out of signal, or done tracking,
  /// and a "live" label would claim more than we know.
  bool get isLiveTracking =>
      trackedAt != null &&
      DateTime.now().difference(trackedAt!) < const Duration(minutes: 2);

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
        trackedAt: j['trackedAt'] == null
            ? null
            : DateTime.parse(j['trackedAt'] as String).toLocal(),
      );
}
