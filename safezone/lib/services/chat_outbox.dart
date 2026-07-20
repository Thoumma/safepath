import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/pending_message.dart';

/// Holds chat messages composed with no signal, and delivers them when the
/// network comes back.
///
/// The sibling of [SosOutbox], with one deliberate difference in *policy*: the
/// SOS queue is flushed above the decoy gate, because a queued emergency must
/// escape a coerced phone. A chat message is not an emergency, so
/// [ChatService] flushes this queue only in a real session — see the gate
/// there. Nothing composed before a duress unlock may leave afterwards.
///
/// Stored in the OS keystore like every other sensitive queue: the contents are
/// what someone in danger wanted to tell an embassy.
class ChatOutbox {
  ChatOutbox._();
  static final ChatOutbox instance = ChatOutbox._();

  static const _key = 'chat_outbox_v1';

  /// Chat is chattier than SOS, so the cap is higher — but still bounded, so a
  /// phone that never regains signal cannot grow the queue forever. Oldest
  /// goes first.
  static const _maxEntries = 20;

  final _storage = const FlutterSecureStorage();
  bool _flushing = false;

  Future<List<PendingMessage>> _read() async {
    if (readOverride != null) return readOverride!();
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) return [];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .map((e) => PendingMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // A corrupt queue must not break the chat screen. Drop it and move on.
      await _storage.delete(key: _key);
      return [];
    }
  }

  Future<void> _write(List<PendingMessage> queue) async {
    if (writeOverride != null) {
      await writeOverride!(queue);
      return;
    }
    if (queue.isEmpty) {
      await _storage.delete(key: _key);
      return;
    }
    await _storage.write(
      key: _key,
      value: jsonEncode(queue.map((e) => e.toJson()).toList()),
    );
  }

  Future<List<PendingMessage>> pending() => _read();

  Future<void> enqueue(PendingMessage message) async {
    final queue = await _read();
    queue.add(message);
    if (queue.length > _maxEntries) {
      queue.removeRange(0, queue.length - _maxEntries);
    }
    await _write(queue);
  }

  Future<void> remove(String clientId) async {
    final queue = await _read();
    queue.removeWhere((m) => m.clientId == clientId);
    await _write(queue);
  }

  Future<void> clear() => _write([]);

  /// Delivers everything queued via [send], oldest first. Returns how many
  /// landed.
  ///
  /// [send] returns true when the console accepted the message. A `false` stops
  /// the batch and keeps the rest queued — if one send failed because the
  /// network is down, the next will too, and hammering it wastes a battery that
  /// may matter later. Order is preserved because a conversation read out of
  /// order is worse than one that arrives late.
  Future<int> flush(Future<bool> Function(PendingMessage) send) async {
    if (_flushing) return 0;
    _flushing = true;
    try {
      final queue = await _read();
      if (queue.isEmpty) return 0;

      var sent = 0;
      final remaining = <PendingMessage>[];
      for (var i = 0; i < queue.length; i++) {
        if (remaining.isNotEmpty) {
          // Already failed once this batch — keep the tail intact.
          remaining.add(queue[i]);
          continue;
        }
        final ok = await send(queue[i]);
        if (ok) {
          sent++;
        } else {
          remaining.add(queue[i]);
        }
      }
      await _write(remaining);
      return sent;
    } finally {
      _flushing = false;
    }
  }

  // ── Test seams (device-free): secure storage has no platform channel under
  // `flutter test`. Reset both to null in tearDown.
  @visibleForTesting
  static Future<List<PendingMessage>> Function()? readOverride;

  @visibleForTesting
  static Future<void> Function(List<PendingMessage>)? writeOverride;
}
