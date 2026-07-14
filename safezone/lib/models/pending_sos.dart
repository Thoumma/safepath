/// An SOS that was raised but never reached the console, because the phone had
/// no signal at the moment it mattered.
///
/// [occurredAt] is the emergency's real time, not the time it is finally
/// delivered. It travels with the payload so the duty officer is told plainly
/// that they are reading something that happened hours ago — a stale GPS point
/// presented as a live one would send a rescue to where the person used to be.
class PendingSos {
  final double lat;
  final double lng;
  final String mapsUrl;
  final bool duress;
  final DateTime occurredAt;

  const PendingSos({
    required this.lat,
    required this.lng,
    required this.mapsUrl,
    required this.duress,
    required this.occurredAt,
  });

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'mapsUrl': mapsUrl,
        'duress': duress,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
      };

  factory PendingSos.fromJson(Map<String, dynamic> j) => PendingSos(
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        mapsUrl: j['mapsUrl'] as String,
        duress: j['duress'] as bool? ?? false,
        occurredAt: DateTime.parse(j['occurredAt'] as String),
      );
}
