import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
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

  Future<void> _confirmAndSend() async {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surfaceContainer,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: SafeZoneTokens.borderRadius,
          side: BorderSide(
            color: colors.outlineVariant,
            width: SafeZoneTokens.ruleHair,
          ),
        ),
        title: Text('ສົ່ງສັນຍານ SOS?', style: text.titleLarge),
        content: Text(
          'ແອັບຈະສົ່ງຕຳແໜ່ງ GPS ຂອງທ່ານໄປຫາຜູ້ຊ່ວຍເຫຼືອ.',
          style: text.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('ຍົກເລີກ'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: tokens.critical,
              foregroundColor: tokens.onCritical,
              shape: const RoundedRectangleBorder(
                borderRadius: SafeZoneTokens.borderRadius,
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('ສົ່ງ SOS'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() {
      _sending = true;
      _error = null;
      _result = null;
    });
    try {
      final res = await SosService.instance.triggerSos();
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
          onTap: _confirmAndSend,
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
        // Amber, not red: offline is the expected case abroad, and the SMS
        // channel is designed to cover exactly this.
        return _statusRow(
            Icons.wifi_off, tokens.highInk, 'ບໍ່ມີເນັດ — ຂ້າມເຊີບເວີ');
      case ServerStatus.failed:
        return _statusRow(Icons.cancel_outlined, tokens.critical,
            'ສົ່ງຫາເຊີບເວີບໍ່ສຳເລັດ');
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
