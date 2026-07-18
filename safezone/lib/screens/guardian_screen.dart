import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/guardian.dart';
import '../services/guardian_service.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';

/// "These people made you their emergency contact."
///
/// The mirror of the Contacts screen. If Somchai lists you and presses SOS, you
/// get his SMS — but until now the app that arranged the whole relationship
/// showed you nothing. This closes the human loop the way the Response Console
/// closes the institutional one.
///
/// Note [GuardianService.load] returns an empty list in decoy mode, so this
/// screen renders an ordinary empty state under duress. That is deliberate; see
/// the gate in that service. Do not add a "hidden in decoy mode" branch here —
/// the empty state must be indistinguishable from a genuine one.
class GuardianScreen extends StatefulWidget {
  const GuardianScreen({super.key});

  @override
  State<GuardianScreen> createState() => _GuardianScreenState();
}

class _GuardianScreenState extends State<GuardianScreen> {
  GuardianResult? _result;
  bool _loading = true;

  /// Polls while at least one guardian is in an active emergency, so their
  /// live GPS trail freshens on this screen without a manual pull. Silent (no
  /// spinner) and stopped the moment nobody is in trouble — an idle Guardian
  /// list must not sit there hitting the network.
  Timer? _liveTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final r = await GuardianService.instance.load();
    if (mounted) {
      setState(() {
        _result = r;
        _loading = false;
      });
      _syncLivePolling();
    }
  }

  /// Refetches without the loading spinner — used by the live poll so the list
  /// updates in place instead of flashing a full-screen loader every tick.
  Future<void> _reloadQuietly() async {
    final r = await GuardianService.instance.load();
    if (mounted) {
      setState(() => _result = r);
      _syncLivePolling();
    }
  }

  /// Runs the poll only while someone is in emergency.
  void _syncLivePolling() {
    final anyEmergency =
        _result?.guardians.any((g) => g.inEmergency) ?? false;
    if (anyEmergency) {
      _liveTimer ??= Timer.periodic(
        const Duration(seconds: 15),
        (_) => _reloadQuietly(),
      );
    } else {
      _liveTimer?.cancel();
      _liveTimer = null;
    }
  }

  Future<void> _call(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _openMap(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ຜູ້ທີ່ໄວ້ໃຈທ່ານ'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'ໂຫຼດໃໝ່',
            onPressed: _load,
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _body(),
        ),
      ),
    );
  }

  Widget _body() {
    final r = _result!;
    switch (r.state) {
      case GuardianState.needsVerification:
        return _message(
          icon: Icons.verified_user_outlined,
          title: 'ຢືນຢັນເບີໂທຂອງທ່ານກ່ອນ',
          detail: 'ພວກເຮົາຕ້ອງຮູ້ວ່າເບີໂທນີ້ແມ່ນຂອງທ່ານແທ້ '
              'ກ່ອນຈະບອກວ່າໃຜເພີ່ມທ່ານເປັນຜູ້ຊ່ວຍເຫຼືອ.',
          action: PrimaryButton(
            label: 'ຕື່ມຂໍ້ມູນ ແລະ ຢືນຢັນ',
            icon: Icons.person_outline,
            onPressed: () async {
              await context.push('/profile');
              _load();
            },
          ),
        );
      case GuardianState.offline:
        return _message(
          icon: Icons.wifi_off,
          title: 'ບໍ່ມີເນັດ',
          detail: 'ລອງໃໝ່ເມື່ອມີອິນເຕີເນັດ.',
        );
      case GuardianState.failed:
        return _message(
          icon: Icons.error_outline,
          title: 'ໂຫຼດບໍ່ສຳເລັດ',
          detail: 'ກະລຸນາລອງໃໝ່.',
        );
      case GuardianState.ok:
        if (r.guardians.isEmpty) {
          return _message(
            icon: Icons.shield_outlined,
            title: 'ຍັງບໍ່ມີໃຜເພີ່ມທ່ານເປັນຜູ້ໄວ້ໃຈ',
            detail: 'ເມື່ອມີຄົນຕັ້ງທ່ານເປັນຜູ້ຊ່ວຍເຫຼືອ ລາຍຊື່ຈະຂຶ້ນຢູ່ນີ້.',
          );
        }
        return ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          itemCount: r.guardians.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) => _guardianCard(r.guardians[i]),
        );
    }
  }

  Widget _guardianCard(Guardian g) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;
    final emergency = g.inEmergency;

    return Container(
      decoration: BoxDecoration(
        // An open case turns the whole card red. Someone scanning this list in
        // a hurry must not have to read to find the person in trouble.
        color: emergency ? tokens.critical.withAlpha(20) : colors.surfaceContainer,
        borderRadius: SafeZoneTokens.borderRadius,
        border: Border.all(
          color: emergency ? tokens.critical : colors.outlineVariant,
          width: emergency ? SafeZoneTokens.rule : SafeZoneTokens.ruleHair,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                emergency ? Icons.warning_amber_rounded : Icons.check_circle_outline,
                color: emergency ? tokens.critical : tokens.success,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(g.fullName, style: text.titleMedium),
                    if (g.relation != null)
                      Text(g.relation!, style: text.bodySmall),
                  ],
                ),
              ),
              Text(
                emergency ? 'ສຸກເສີນ' : 'ປອດໄພ',
                style: text.labelLarge!.copyWith(
                  color: emergency ? tokens.criticalInk : tokens.successInk,
                ),
              ),
            ],
          ),

          if (emergency && g.activeCase != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Text(
              'ກົດ SOS ເມື່ອ ${_formatTime(g.activeCase!.createdAt)}',
              style: text.bodyMedium,
            ),
            // Live GPS trail. When the app is streaming fresh fixes, say so and
            // stamp the last one — "ເບິ່ງແຜນທີ່" below always opens the newest
            // position because lat/lng track it. When the stream has gone quiet
            // (phone off / no signal), drop the live chip but still show when
            // we last heard, so a trusted contact knows how stale the pin is.
            if (g.activeCase!.trackedAt != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  if (g.activeCase!.isLiveTracking) ...[
                    Icon(Icons.my_location, size: 15, color: tokens.criticalInk),
                    const SizedBox(width: 6),
                    Text(
                      'ຕິດຕາມສົດ',
                      style: text.labelMedium!.copyWith(color: tokens.criticalInk),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Text(
                      'ອັບເດດຕຳແໜ່ງ ${_formatTime(g.activeCase!.trackedAt!)}',
                      style: text.bodySmall,
                    ),
                  ),
                ],
              ),
            ],
            if (g.activeCase!.city != null || g.activeCase!.country != null) ...[
              const SizedBox(height: 4),
              Text(
                [g.activeCase!.city, g.activeCase!.country]
                    .where((e) => e != null)
                    .join(', '),
                style: text.bodyMedium,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (g.activeCase!.hasLocation)
                  Expanded(
                    child: PrimaryButton(
                      label: 'ເບິ່ງແຜນທີ່',
                      icon: Icons.map_outlined,
                      isSecondary: true,
                      onPressed: () => _openMap(g.activeCase!.mapsUrl),
                    ),
                  ),
                if (g.activeCase!.hasLocation && g.phone != null)
                  const SizedBox(width: 12),
                if (g.phone != null)
                  Expanded(
                    child: PrimaryButton(
                      label: 'ໂທຫາ',
                      icon: Icons.phone,
                      onPressed: () => _call(g.phone!),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _message({
    required IconData icon,
    required String title,
    required String detail,
    Widget? action,
  }) {
    final colors = context.colors;
    final text = context.text;

    // Must scroll, or RefreshIndicator has nothing to pull on.
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 80),
      children: [
        Icon(icon, size: 56, color: colors.outline),
        const SizedBox(height: 20),
        Text(title, textAlign: TextAlign.center, style: text.titleMedium),
        const SizedBox(height: 8),
        Text(detail, textAlign: TextAlign.center, style: text.bodyMedium),
        if (action != null) ...[
          const SizedBox(height: 24),
          action,
        ],
      ],
    );
  }

  String _formatTime(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'ຫາກໍ່ດຽວນີ້';
    if (d.inMinutes < 60) return '${d.inMinutes} ນາທີກ່ອນ';
    if (d.inHours < 24) return '${d.inHours} ຊົ່ວໂມງກ່ອນ';
    return '${d.inDays} ມື້ກ່ອນ';
  }
}
