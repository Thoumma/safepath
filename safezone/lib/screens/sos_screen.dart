import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
import '../services/live_tracking_service.dart';
import '../services/sos_server.dart';
import '../services/sos_service.dart';
import '../widgets/sos_button.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  bool _sending = false;
  SosDispatch? _result;
  String? _error;

  /// The hold gesture on [SosButton] is itself the confirmation, so this sends
  /// straight away — no dialog.
  Future<void> _send() async {
    setState(() {
      _sending = true;
      _error = null;
      _result = null;
    });
    try {
      final res = await SosService.instance.triggerSos();
      // A case now exists on the console, so begin streaming live GPS to it.
      // Only when the server actually accepted the alert — an offline/queued
      // send has no case yet, and tracking it would 404 every tick until the
      // outbox flushes. Home resumes tracking once that case appears.
      if (res.serverStatus == ServerStatus.sent) {
        LiveTrackingService.instance.start();
      }
      if (mounted) setState(() => _result = res);
    } on SosException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = 'ເກີດຂໍ້ຜິດພາດ: $e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SOS ສຸກເສີນ'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Center(
            child: AnimatedSwitcher(
              duration: SafeZoneTokens.durationNormal,
              switchInCurve: SafeZoneTokens.easing,
              switchOutCurve: SafeZoneTokens.easing,
              child: _body(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _body() {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    if (_sending) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        key: const ValueKey('sending'),
        children: [
          CircularProgressIndicator(color: tokens.critical),
          const SizedBox(height: 24),
          Text(
            'ກຳລັງດຶງຕຳແໜ່ງ ແລະ ກຽມຂໍ້ມູນ...',
            textAlign: TextAlign.center,
            style: text.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'ກະລຸນາລໍຖ້າຈົນກວ່າຂັ້ນຕອນຈະສຳເລັດ',
            textAlign: TextAlign.center,
            style: text.bodySmall,
          ),
        ],
      );
    }

    if (_result != null) {
      final d = _result!;
      // "Success" means at least one channel actually carried the location out
      // of the device. If neither did, say so — a green tick over a failed
      // send is the worst possible lie to tell someone in an emergency.
      final anySent = d.smsLaunched || d.serverStatus == ServerStatus.sent;

      return Container(
        key: const ValueKey('success'),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: colors.surfaceContainer,
          borderRadius: SafeZoneTokens.borderRadius,
          border: Border.all(
            color: colors.outlineVariant,
            width: SafeZoneTokens.ruleHair,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(
              anySent ? Icons.check_circle : Icons.error_outline,
              color: anySent ? tokens.success : tokens.critical,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              anySent ? 'ສົ່ງຕຳແໜ່ງແລ້ວ' : 'ສົ່ງບໍ່ສຳເລັດ',
              textAlign: TextAlign.center,
              style: text.titleLarge,
            ),
            const SizedBox(height: 20),
            _smsRow(d),
            const SizedBox(height: 10),
            _serverRow(d),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 20),
            Text('ພິກັດ GPS ຂອງເຈົ້າ:', style: text.labelMedium),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final uri = Uri.parse(_result!.mapsUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri);
                }
              },
              borderRadius: SafeZoneTokens.borderRadius,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: SafeZoneTokens.borderRadius,
                  border: Border.all(
                    color: colors.outlineVariant,
                    width: SafeZoneTokens.ruleHair,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.map_outlined, color: colors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _result!.mapsUrl,
                        style: text.bodySmall!.copyWith(
                          color: colors.primary,
                          decoration: TextDecoration.underline,
                          decorationColor: colors.primary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      key: const ValueKey('idle'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (_error != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colors.errorContainer,
              borderRadius: SafeZoneTokens.borderRadius,
              border: Border.all(
                color: tokens.critical,
                width: SafeZoneTokens.ruleHair,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.error_outline,
                  color: colors.onErrorContainer,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _error!,
                    style: text.labelLarge!.copyWith(
                      color: colors.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],

        // Pulse Emergency SOS button
        SosButton(
          onTriggered: _send,
        ),
      ],
    );
  }

  /// One channel's outcome: icon + Lao label, with colour carrying the meaning.
  Widget _statusRow(IconData icon, Color color, String label) {
    final text = context.text;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(label, style: text.bodyMedium!.copyWith(color: color)),
        ),
      ],
    );
  }

  Widget _smsRow(SosDispatch d) {
    final tokens = context.tokens;
    if (d.smsLaunched) {
      return _statusRow(Icons.check_circle_outline, tokens.success,
          'ສົ່ງ SMS ຫາ ${d.contactNames}');
    }
    if (d.contactNames == null) {
      // Muted, not red: having no contact set up is a gap to fill later, not a
      // failure of this send.
      return _statusRow(Icons.remove_circle_outline, tokens.muted,
          'ບໍ່ໄດ້ຕັ້ງ Trusted Contact');
    }
    return _statusRow(
        Icons.cancel_outlined, tokens.critical, 'ເປີດ SMS ບໍ່ສຳເລັດ');
  }

  Widget _serverRow(SosDispatch d) {
    final tokens = context.tokens;
    switch (d.serverStatus) {
      case ServerStatus.sent:
        return _statusRow(Icons.check_circle_outline, tokens.success,
            'ສົ່ງຫາເຊີບເວີ VFI ແລ້ວ');
      case ServerStatus.skippedOffline:
        // Amber, not red: offline is the expected case abroad, the SMS channel
        // is designed to cover exactly this, and the alert is now held in the
        // outbox rather than lost. Say that it will still arrive — a traveller
        // who thinks the embassy will never hear about this behaves very
        // differently from one who knows it is on its way.
        return _statusRow(
            Icons.schedule_send_outlined,
            tokens.highInk,
            d.queued
                ? 'ບໍ່ມີເນັດ — ຈະສົ່ງໃຫ້ອັດຕະໂນມັດເມື່ອມີສັນຍານ'
                : 'ບໍ່ມີເນັດ — ຂ້າມເຊີບເວີ');
      case ServerStatus.failed:
        return _statusRow(
            d.queued ? Icons.schedule_send_outlined : Icons.cancel_outlined,
            d.queued ? tokens.highInk : tokens.critical,
            d.queued
                ? 'ສົ່ງຫາເຊີບເວີບໍ່ສຳເລັດ — ຈະລອງໃໝ່ອັດຕະໂນມັດ'
                : 'ສົ່ງຫາເຊີບເວີບໍ່ສຳເລັດ');
      case ServerStatus.noProfile:
        // The app is fine; the *user* has a step left. Saying "the server is
        // off" here would be a lie, and would hide the one thing they can fix.
        return _statusRow(Icons.person_off_outlined, tokens.highInk,
            'ຍັງບໍ່ໄດ້ຕື່ມຂໍ້ມູນຂອງທ່ານ — ສະຖານທູດຍັງບໍ່ຮູ້');
      case ServerStatus.notConfigured:
        return _statusRow(Icons.remove_circle_outline, tokens.muted,
            'ຍັງບໍ່ເປີດໃຊ້ເຊີບເວີ');
    }
  }
}
