/// One message in the thread between the user and the embassy duty officer.
///
/// `pending` marks a message that is composed and queued but not yet accepted
/// by the server — the UI shows it immediately (a message that vanishes while
/// you are in trouble is unforgivable) with a "sending" mark, and it becomes an
/// ordinary message once a flush succeeds.
class ChatMessage {
  final String id;
  final bool fromStaff;
  final String body;

  /// Who wrote it, for staff messages ("ສະຖານທູດ" when the console did not
  /// supply a name). Null for the user's own messages.
  final String? authorName;

  final DateTime createdAt;
  final bool pending;

  const ChatMessage({
    required this.id,
    required this.fromStaff,
    required this.body,
    this.authorName,
    required this.createdAt,
    this.pending = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] as String,
        fromStaff: (j['direction'] as String?) == 'FROM_STAFF',
        body: j['body'] as String? ?? '',
        authorName: j['authorName'] as String?,
        createdAt: DateTime.parse(j['createdAt'] as String).toLocal(),
      );
}
