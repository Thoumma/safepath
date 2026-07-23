import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/console_config.dart';
import '../models/chat_message.dart';
import '../models/pending_message.dart';
import 'auth_service.dart';
import 'chat_outbox.dart';
import 'phone_identity.dart';

/// What became of a message the moment it was sent.
enum ChatSendOutcome {
  /// The console accepted it — it is now in the duty officer's thread.
  sent,

  /// There is no open case to attach it to. Retrying can never help, so the
  /// message is not queued; the UI tells the user their case is closed.
  noOpenCase,

  /// A transient failure (no signal, server down). The message was queued and
  /// will be retried on the next flush — the UI shows it as "sending".
  failed,
}

/// The case thread as the app last saw it.
class ChatThread {
  const ChatThread({required this.messages, required this.hasOpenCase});

  /// Oldest first, exactly as the console returns them. Staff and citizen
  /// messages interleaved.
  final List<ChatMessage> messages;

  /// False when the console has no open case for this user — the thread is read
  /// only, nothing new can be sent.
  final bool hasOpenCase;
}

/// The user's side of the two-way thread with the embassy duty officer.
///
/// The receiving half of a conversation whose sending half already existed as
/// [CaseService.sendReason]. Staff reply from the console (`case-chat.tsx`); the
/// console stores those `FROM_STAFF` messages and serves the whole thread back
/// from `/api/me/case/messages`. This is the only place in the app that reads
/// them — there are no push notifications, so a message is seen when the user
/// opens this screen, which is exactly what the console warns the officer of.
///
/// Offline sends go through [ChatOutbox], the sibling of [SosOutbox] — a message
/// composed with no signal is shown immediately and delivered when the network
/// returns.
class ChatService {
  ChatService._();
  static final ChatService instance = ChatService._();

  bool get _blocked =>
      // ── Duress gate. Same rule, same reason, as [CaseService]. ─────────────
      //
      // In decoy mode an attacker holds the phone. The console refuses to serve
      // or accept messages on a DURESS case at all (see api/me/case/messages),
      // and this is the second lock: the request is never even made, and — see
      // [send] and [flushOutbox] — nothing composed under duress is ever
      // queued or flushed.
      AuthService.instance.isDecoy ||
      !ConsoleConfig.isConfigured ||
      PhoneIdentity.instance.accessToken == null;

  Map<String, String> get _authHeaders => {
        'Authorization': 'Bearer ${PhoneIdentity.instance.accessToken}',
      };

  /// The whole thread, or null on any failure — an unreachable server reads as
  /// "couldn't load", never as an error the user must dismiss. Merely fetching
  /// marks staff messages read on the console, so there is nothing else to call.
  Future<ChatThread?> loadThread() async {
    if (_blocked) return null;

    try {
      final res = await http
          .get(ConsoleConfig.caseMessagesEndpoint, headers: _authHeaders)
          .timeout(const Duration(seconds: 10));

      if (res.statusCode != 200) return null;

      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final raw = (body['messages'] as List<dynamic>? ?? const []);
      final messages = raw
          .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
          .toList();
      return ChatThread(
        messages: messages,
        hasOpenCase: body['open'] == true,
      );
    } on SocketException {
      return null;
    } on TimeoutException {
      return null;
    } on http.ClientException {
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Sends [body], queueing it for later only on a transient failure.
  ///
  /// A [ChatSendOutcome.noOpenCase] result is deliberately *not* queued: with no
  /// case to attach to, a queued message would sit in the outbox forever. And a
  /// decoy session never queues anything — nothing composed under duress may
  /// leave the phone after a real unlock.
  Future<ChatSendOutcome> send(String body) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty) return ChatSendOutcome.failed;

    final message = PendingMessage(
      clientId: _newClientId(),
      body: trimmed,
      composedAt: _now(),
    );

    final outcome = await _deliver(message);
    if (outcome == ChatSendOutcome.failed && !AuthService.instance.isDecoy) {
      await ChatOutbox.instance.enqueue(message);
    }
    return outcome;
  }

  /// Delivers everything queued, oldest first. Returns how many landed.
  ///
  /// Gated by [_blocked], so it is a no-op in decoy mode: a message composed
  /// before a duress unlock must never escape afterwards. Safe to call often.
  Future<int> flushOutbox() async {
    if (_blocked) return 0;
    return ChatOutbox.instance.flush((m) async {
      final outcome = await _deliver(m);
      // Drop it from the queue when it landed *or* can never land (the case is
      // closed). Keep it only on a retryable failure — same batch-stopping
      // behaviour [ChatOutbox.flush] expects from a `false`.
      return outcome != ChatSendOutcome.failed;
    });
  }

  /// The messages still waiting in the outbox, so the screen can render them as
  /// pending bubbles beneath the delivered thread.
  Future<List<PendingMessage>> pendingMessages() {
    if (AuthService.instance.isDecoy) return Future.value(const []);
    return ChatOutbox.instance.pending();
  }

  Future<ChatSendOutcome> _deliver(PendingMessage m) async {
    if (deliverOverride != null) return deliverOverride!(m);
    if (_blocked) return ChatSendOutcome.failed;

    try {
      final res = await http
          .post(
            ConsoleConfig.caseMessagesEndpoint,
            headers: {
              'Content-Type': 'application/json',
              ..._authHeaders,
            },
            body: jsonEncode(m.toJson()),
          )
          .timeout(const Duration(seconds: 10));

      if (res.statusCode == 201) return ChatSendOutcome.sent;
      // 200 with `open:false` — the case is closed, there is nowhere to put it.
      if (res.statusCode == 200) return ChatSendOutcome.noOpenCase;
      // 4xx/5xx: treat as transient and retry. The one non-retryable 4xx is a
      // body over 2000 chars, which the composer prevents before it gets here.
      return ChatSendOutcome.failed;
    } catch (_) {
      return ChatSendOutcome.failed;
    }
  }

  String _newClientId() =>
      '${_now().microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}';

  // ── Test seams. Reset to null in tearDown. ────────────────────────────────

  /// Stands in for the real network POST so send/flush logic is testable with
  /// no server.
  @visibleForTesting
  static Future<ChatSendOutcome> Function(PendingMessage)? deliverOverride;

  /// Fixed clock for compose timestamps and client ids.
  @visibleForTesting
  static DateTime Function()? nowOverride;

  DateTime _now() => (nowOverride ?? DateTime.now)();
}
