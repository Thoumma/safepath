import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
import '../services/case_service.dart';
import '../services/live_tracking_service.dart';
import '../services/sos_server.dart';
import '../services/sos_service.dart';

/// The card that slides up the moment an SOS fires. It does the sending itself
/// (so the alarm goes out before any typing), reports what actually left the
/// device per channel, and lets the user *optionally* add a reason — which is
/// attached to their new case for the duty officer. Adding a reason is never
/// required and never blocks: the location is already on its way.
class SosResultSheet extends StatefulWidget {
  const SosResultSheet({super.key});

  @override
  State<SosResultSheet> createState() => _SosResultSheetState();
}

class _SosResultSheetState extends State<SosResultSheet> {
  bool _sending = true;
  SosDispatch? _result;
  String? _error;

  final _reason = TextEditingController();
  bool _sendingReason = false;
  bool _reasonSent = false;

  @override
  void initState() {
    super.initState();
    _fire();
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _fire() async {
    try {
      final res = await SosService.instance.triggerSos();
      // A case now exists on the console, so begin streaming live GPS to it —
      // only when the server actually accepted, mirroring the old screen.
      if (res.serverStatus == ServerStatus.sent) {
        LiveTrackingService.instance.start();
      }
      if (mounted) {
        setState(() {
          _result = res;
          _sending = false;
        });
      }
    } on SosException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _sending = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'ເກີດຂໍ້ຜິດພາດ: $e';
          _sending = false;
        });
      }
    }
  }

  Future<void> _submitReason() async {
    final text = _reason.text.trim();
    if (text.isEmpty) return;
    setState(() => _sendingReason = true);
    final ok = await CaseService.instance.sendReason(text);
    if (!mounted) return;
    setState(() {
      _sendingReason = false;
      _reasonSent = ok;
    });
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(ok ? 'ສົ່ງເຫດຜົນແລ້ວ' : 'ສົ່ງເຫດຜົນບໍ່ສຳເລັດ'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      // Lift above the keyboard when the reason field is focused.
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(SafeZoneTokens.radius),
          ),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Grabber.
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: colors.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                _body(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _body() {
    final tokens = context.tokens;
    final text = context.text;

    if (_sending) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          CircularProgressIndicator(color: tokens.critical),
          const SizedBox(height: 20),
          Text('ກຳລັງສົ່ງສັນຍານສຸກເສີນ...', style: text.titleMedium),
          const SizedBox(height: 24),
        ],
      );
    }

    if (_error != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.error_outline, color: tokens.critical, size: 56),
          const SizedBox(height: 12),
          Text('ສົ່ງບໍ່ສຳເລັດ',
              textAlign: TextAlign.center, style: text.titleLarge),
          const SizedBox(height: 8),
          Text(_error!, textAlign: TextAlign.center, style: text.bodyMedium),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('ປິດ'),
          ),
        ],
      );
    }

    final d = _result!;
    final anySent = d.smsLaunched || d.serverStatus == ServerStatus.sent;
    // The reason can only attach to a case the server actually opened.
    final canAddReason = d.serverStatus == ServerStatus.sent;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(
          anySent ? Icons.check_circle : Icons.error_outline,
          color: anySent ? tokens.success : tokens.critical,
          size: 56,
        ),
        const SizedBox(height: 8),
        Text(
          anySent ? 'ສົ່ງຕຳແໜ່ງແລ້ວ' : 'ສົ່ງບໍ່ສຳເລັດ',
          textAlign: TextAlign.center,
          style: text.titleLarge,
        ),
        const SizedBox(height: 16),
        _smsRow(d),
        const SizedBox(height: 8),
        _serverRow(d),

        if (canAddReason) ...[
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 12),
          Text('ເພີ່ມເຫດຜົນ (ບໍ່ບັງຄັບ)', style: text.labelLarge),
          const SizedBox(height: 4),
          Text(
            'ບອກສະຖານທູດວ່າເກີດຫຍັງຂຶ້ນ — ຕຳແໜ່ງຂອງທ່ານໄດ້ສົ່ງໄປແລ້ວ',
            style: text.bodySmall,
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _reason,
            enabled: !_reasonSent,
            minLines: 2,
            maxLines: 4,
            maxLength: 2000,
            textInputAction: TextInputAction.newline,
            decoration: const InputDecoration(
              hintText: 'ຕົວຢ່າງ: ມີຄົນຕິດຕາມຂ້ອຍ ຢູ່ໃກ້ສະຖານີລົດໄຟ',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: const Text('ຂ້າມ'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: (_sendingReason || _reasonSent)
                      ? null
                      : _submitReason,
                  child: Text(
                    _reasonSent
                        ? 'ສົ່ງແລ້ວ'
                        : _sendingReason
                            ? 'ກຳລັງສົ່ງ...'
                            : 'ສົ່ງເຫດຜົນ',
                  ),
                ),
              ),
            ],
          ),
        ] else ...[
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('ແລ້ວໆ'),
          ),
        ],

        const SizedBox(height: 8),
        // The location itself, tappable — same affordance as before.
        Center(
          child: TextButton.icon(
            onPressed: () async {
              final uri = Uri.parse(d.mapsUrl);
              if (await canLaunchUrl(uri)) await launchUrl(uri);
            },
            icon: const Icon(Icons.map_outlined, size: 18),
            label: const Text('ເປີດແຜນທີ່ຕຳແໜ່ງ'),
          ),
        ),
      ],
    );
  }

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
        return _statusRow(Icons.person_off_outlined, tokens.highInk,
            'ຍັງບໍ່ໄດ້ຕື່ມຂໍ້ມູນຂອງທ່ານ — ສະຖານທູດຍັງບໍ່ຮູ້');
      case ServerStatus.notConfigured:
        return _statusRow(Icons.remove_circle_outline, tokens.muted,
            'ຍັງບໍ່ເປີດໃຊ້ເຊີບເວີ');
    }
  }
}
