import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/pending_sos.dart';
import 'sos_server.dart';

/// Holds SOS reports that could not reach the console, and delivers them when
/// the network comes back.
///
/// ## Why this exists
///
/// `SosServer` deliberately never throws: if there is no signal it reports
/// `skippedOffline` and lets the SMS channel carry the emergency, which is
/// right. But the *case* was then simply lost. The traveller with no data abroad
/// — the exact person this app is for — could press SOS, get an SMS out to their
/// family, walk back into coverage an hour later, and the embassy would never
/// learn that anything had happened at all.
///
/// The queue is stored in the OS keystore, not in shared preferences: a pending
/// entry is a GPS fix of a person in trouble, plus a duress flag. That is the
/// most sensitive record this app writes outside the passport vault.
class SosOutbox {
  SosOutbox._();
  static final SosOutbox instance = SosOutbox._();

  static const _key = 'sos_outbox_v1';

  /// Old alerts are still worth delivering — an unanswered emergency does not
  /// stop mattering because time passed — but the queue must not grow without
  /// bound on a phone that never regains signal. Oldest goes first.
  static const _maxEntries = 10;

  final _storage = const FlutterSecureStorage();

  /// Guards against two flushes overlapping (app resume racing a screen
  /// refresh) and delivering the same alert twice.
  bool _flushing = false;

  Future<List<PendingSos>> _read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) return [];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .map((e) => PendingSos.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // A corrupt queue must not brick the SOS path. Drop it and move on.
      await _storage.delete(key: _key);
      return [];
    }
  }

  Future<void> _write(List<PendingSos> queue) async {
    if (queue.isEmpty) {
      await _storage.delete(key: _key);
      return;
    }
    await _storage.write(
      key: _key,
      value: jsonEncode(queue.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> enqueue(PendingSos pending) async {
    final queue = await _read();
    queue.add(pending);
    if (queue.length > _maxEntries) {
      queue.removeRange(0, queue.length - _maxEntries);
    }
    await _write(queue);
  }

  Future<bool> get hasPending async => (await _read()).isNotEmpty;

  /// Tries to deliver everything queued. Returns how many landed.
  ///
  /// An entry is removed only once the console has accepted it. Anything that
  /// fails — still offline, still broken — stays queued for the next attempt;
  /// dropping it would silently discard an emergency. Safe to call often, and
  /// safe to call with no network.
  Future<int> flush() async {
    if (_flushing) return 0;
    _flushing = true;
    try {
      final queue = await _read();
      if (queue.isEmpty) return 0;

      final remaining = <PendingSos>[];
      var sent = 0;

      for (var i = 0; i < queue.length; i++) {
        final p = queue[i];
        final status = await SosServer.instance.sendLocation(
          lat: p.lat,
          lng: p.lng,
          mapsUrl: p.mapsUrl,
          duress: p.duress,
          occurredAt: p.occurredAt,
        );

        if (status == ServerStatus.sent) {
          sent++;
          continue;
        }

        remaining.add(p);

        // The whole batch shares one network and one session, so these three
        // outcomes are properties of the *device*, not of this entry: nothing
        // after it can do better. Keep the rest queued and stop, rather than
        // burn a timeout each on a phone that plainly has no signal.
        if (status == ServerStatus.skippedOffline ||
            status == ServerStatus.notConfigured ||
            status == ServerStatus.noProfile) {
          remaining.addAll(queue.sublist(i + 1));
          break;
        }
      }

      await _write(remaining);
      return sent;
    } finally {
      _flushing = false;
    }
  }
}
