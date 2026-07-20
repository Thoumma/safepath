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

  /// Their opt-in journey share ("watch me while I travel"), or null when they
  /// are not sharing / the share has gone stale. Routine, not an emergency —
  /// the map draws it calm where a case trail draws loud.
  final GuardianJourney? journey;

  const Guardian({
    required this.citizenId,
    required this.fullName,
    this.phone,
    this.relation,
    required this.inEmergency,
    this.activeCase,
    this.journey,
  });

  /// Anything to put on a map at all?
  bool get hasAnyLocation =>
      (activeCase?.hasLocation ?? false) || journey != null;

  factory Guardian.fromJson(Map<String, dynamic> j) => Guardian(
        citizenId: j['citizenId'] as String,
        fullName: j['fullName'] as String,
        phone: j['phone'] as String?,
        relation: j['relation'] as String?,
        inEmergency: j['inEmergency'] as bool? ?? false,
        activeCase: j['case'] == null
            ? null
            : GuardianCase.fromJson(j['case'] as Map<String, dynamic>),
        journey: j['journey'] == null
            ? null
            : GuardianJourney.fromJson(j['journey'] as Map<String, dynamic>),
      );
}

/// One breadcrumb of a trail — shared by the case trail and the journey trail.
class TrailPoint {
  final double lat;
  final double lng;
  final DateTime at;

  const TrailPoint({required this.lat, required this.lng, required this.at});

  factory TrailPoint.fromJson(Map<String, dynamic> j) => TrailPoint(
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        at: DateTime.parse(j['at'] as String).toLocal(),
      );

  static List<TrailPoint> listFromJson(dynamic j) => j == null
      ? const []
      : (j as List)
          .map((e) => TrailPoint.fromJson(e as Map<String, dynamic>))
          .toList();
}

/// A guardian's live journey share: the latest fix plus the recent trail.
class GuardianJourney {
  final double lat;
  final double lng;
  final DateTime at;
  final List<TrailPoint> trail;

  const GuardianJourney({
    required this.lat,
    required this.lng,
    required this.at,
    this.trail = const [],
  });

  /// Fresh within ~3 intervals of the journey stream (one a minute) — beyond
  /// that the phone is off or out of signal, and "live" would overclaim.
  bool get isLive =>
      DateTime.now().difference(at) < const Duration(minutes: 3);

  String get mapsUrl => 'https://maps.google.com/?q=$lat,$lng';

  factory GuardianJourney.fromJson(Map<String, dynamic> j) => GuardianJourney(
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        at: DateTime.parse(j['at'] as String).toLocal(),
        trail: TrailPoint.listFromJson(j['trail']),
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

  /// The recent breadcrumb trail (oldest first), for drawing the path on the
  /// in-app map. Empty when the case has only its opening point.
  final List<TrailPoint> trail;

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
    this.trail = const [],
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
        trail: TrailPoint.listFromJson(j['trail']),
      );
}
