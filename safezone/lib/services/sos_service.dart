import 'package:url_launcher/url_launcher.dart';
import '../models/pending_sos.dart';
import 'contact_store.dart';
import 'location_service.dart';
import 'sos_outbox.dart';
import 'sos_server.dart';

class SosException implements Exception {
  final String message;
  SosException(this.message);
  @override
  String toString() => message;
}

/// What actually went out, per channel. The SOS screen reports each one
/// separately: a partial send is still a send, and the user needs to know
/// exactly which half of it landed.
class SosDispatch {
  /// Names of the contacts the SMS was addressed to; null if none configured.
  final String? contactNames;
  final String mapsUrl;

  /// The SMS composer was opened. Note this means *opened*, not *sent* — the
  /// OS hands control to the messaging app and never tells us what the user
  /// did next. Do not claim more than this in the UI.
  final bool smsLaunched;

  final ServerStatus serverStatus;

  /// The server could not be reached, so the alert was written to [SosOutbox]
  /// and will be delivered as soon as the phone has signal again. Not a
  /// success — nobody at the embassy knows yet — but not a loss either, and the
  /// difference matters enormously to the person standing there reading it.
  final bool queued;

  SosDispatch({
    required this.contactNames,
    required this.mapsUrl,
    required this.smsLaunched,
    required this.serverStatus,
    this.queued = false,
  });

  /// True when nothing left the device *and* nothing is waiting to. A queued
  /// alert is not a failure: it is guaranteed delivery, just not yet.
  bool get isTotalFailure =>
      !smsLaunched && serverStatus != ServerStatus.sent && !queued;
}

class SosService {
  SosService._();
  static final SosService instance = SosService._();

  /// Sends the user's GPS location to help, over two independent channels:
  /// the Trusted Contact (SMS) and the server (Supabase).
  ///
  /// The channels cannot abort each other — a dead server must never stop the
  /// SMS, which is the one that works with no internet. This throws only when
  /// there is nothing to send (no GPS) or nowhere to send it (no contact and
  /// no server).
  ///
  /// The passport is deliberately not part of this flow; sharing it is a
  /// separate, manual action on the Passport screen.
  ///
  /// [duress] is passed only by the silent alert that fires when the user
  /// unlocks with their *fake* password under coercion. It travels to the
  /// console (which raises the case to CRITICAL so the duty officer knows the
  /// person was forced) and changes nothing the attacker holding the phone can
  /// see.
  Future<SosDispatch> triggerSos({bool duress = false}) async {
    // GPS is the one hard requirement: with no location there is nothing to
    // send, so this is the only failure that aborts the whole flow.
    final loc = await LocationService.instance.getCurrentLocation();
    if (loc.position == null) {
      throw SosException(loc.error ?? 'ດຶງຕຳແໜ່ງບໍ່ສຳເລັດ.');
    }
    final pos = loc.position!;
    final mapsUrl =
        LocationService.instance.mapsUrl(pos.latitude, pos.longitude);

    // Channel 1: server. Never throws; reports its own status.
    final occurredAt = DateTime.now();
    final serverStatus = await SosServer.instance.sendLocation(
      lat: pos.latitude,
      lng: pos.longitude,
      mapsUrl: mapsUrl,
      duress: duress,
      occurredAt: occurredAt,
    );

    // The server did not hear us, but the emergency happened all the same. Hold
    // it and deliver it when there is signal — otherwise a traveller with no
    // data (the very person this app exists for) could raise an alarm the
    // embassy would simply never learn about, no matter how long they waited.
    //
    // Only the transient failures are queued. `noProfile` and `notConfigured`
    // are not going to fix themselves on the next attempt, so retrying them
    // forever would just be a silent loop.
    final queued = serverStatus == ServerStatus.skippedOffline ||
        serverStatus == ServerStatus.failed;
    if (queued) {
      await SosOutbox.instance.enqueue(PendingSos(
        lat: pos.latitude,
        lng: pos.longitude,
        mapsUrl: mapsUrl,
        duress: duress,
        occurredAt: occurredAt,
      ));
    }

    // Channel 2: SMS. Works with no internet, so it is the channel of last
    // resort. Failure here is contained, not propagated.
    final contacts = await ContactStore.instance.loadContacts();
    var smsLaunched = false;
    if (contacts.isNotEmpty) {
      try {
        final body = Uri.encodeComponent(
            'SafeZone EMERGENCY. ຕຳແໜ່ງຂອງຂ້ອຍ: $mapsUrl . ກະລຸນາຊ່ວຍ.');
        final recipients = contacts.map((c) => c.phone).join(',');
        final smsUri = Uri.parse('sms:$recipients?body=$body');
        if (await canLaunchUrl(smsUri)) {
          smsLaunched = await launchUrl(smsUri);
        }
      } catch (_) {
        smsLaunched = false;
      }
    }

    final dispatch = SosDispatch(
      contactNames:
          contacts.isEmpty ? null : contacts.map((c) => c.name).join(', '),
      mapsUrl: mapsUrl,
      smsLaunched: smsLaunched,
      serverStatus: serverStatus,
      queued: queued,
    );

    // Both channels are dead ends: tell the user plainly that nothing went out
    // rather than showing a success screen that lies to them. This covers every
    // way that happens — no contact and the server was unreachable, or off, or
    // has no profile to open a case with.
    if (dispatch.isTotalFailure) {
      throw SosException(contacts.isEmpty
          ? 'ຍັງບໍ່ໄດ້ຕັ້ງຜູ້ຊ່ວຍເຫຼືອ. ກະລຸນາເພີ່ມຜູ້ຊ່ວຍເຫຼືອກ່ອນ.'
          : 'ສົ່ງບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.');
    }

    return dispatch;
  }
}
