/// A chat message composed on the device but not yet accepted by the console.
///
/// The sibling of [PendingSos]. Two fields exist that the SOS queue does not
/// need:
///
/// - [clientId] — a locally generated id the server upserts on. Unlike a GPS
///   fix, message text legitimately repeats ("ok" twice is two real messages),
///   so a retry cannot be de-duplicated by content. Without this, one failed
///   flush that actually landed would post the message twice.
/// - [composedAt] — when it was *written*, not when it was delivered. A message
///   that finally sends an hour later must not claim to be an hour late reply.
class PendingMessage {
  final String clientId;
  final String body;
  final DateTime composedAt;

  const PendingMessage({
    required this.clientId,
    required this.body,
    required this.composedAt,
  });

  Map<String, dynamic> toJson() => {
        'clientId': clientId,
        'body': body,
        'composedAt': composedAt.toUtc().toIso8601String(),
      };

  factory PendingMessage.fromJson(Map<String, dynamic> j) => PendingMessage(
        clientId: j['clientId'] as String,
        body: j['body'] as String? ?? '',
        composedAt: DateTime.parse(j['composedAt'] as String).toLocal(),
      );
}
