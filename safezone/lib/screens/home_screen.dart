import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';
import '../models/guardian.dart';
import '../services/auth_service.dart';
import '../services/case_service.dart';
import '../services/contact_store.dart';
import '../services/live_tracking_service.dart';
import '../services/passport_store.dart';
import '../services/profile_store.dart';
import '../services/sos_outbox.dart';
import '../widgets/status_tile.dart';
import '../widgets/sos_button.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _hasPassport = false;
  bool _hasContact = false;
  bool _needsProfile = false;
  GuardianCase? _openCase;
  bool _resolving = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    // Second flush trigger, after the one in main(). Home is refreshed on every
    // return from a screen, which is the cheapest reliable proxy for "the user
    // is active and may have walked back into coverage". Above the decoy gate on
    // purpose — a queued alert must go out whoever is holding the phone — and
    // not awaited, so a slow network cannot stall the dashboard.
    unawaited(SosOutbox.instance.flush());

    // In decoy (duress) mode the dashboard shows nothing configured, so the
    // real passport/contact are never revealed. The profile prompt is hidden
    // too — offering to "complete your profile" would tell an attacker that a
    // real profile exists somewhere behind another password. So is the open-case
    // banner: `CaseService` refuses to load one in decoy mode, and the console
    // will not serve a duress case to the device at all.
    if (AuthService.instance.isDecoy) {
      if (mounted) {
        setState(() {
          _hasPassport = false;
          _hasContact = false;
          _needsProfile = false;
          _openCase = null;
        });
      }
      return;
    }
    final hp = await PassportStore.instance.hasPassport();
    final contacts = await ContactStore.instance.loadContacts();
    final verified = await ProfileStore.instance.hasVerifiedPhone;
    if (mounted) {
      setState(() {
        _hasPassport = hp;
        _hasContact = contacts.isNotEmpty;
        _needsProfile = !verified;
      });
    }

    // Separate round trip: it hits the network, and the local dashboard must
    // not wait on it.
    final open = await CaseService.instance.loadOpenCase();
    if (mounted) setState(() => _openCase = open);

    // Keep tracking in step with the case. Resume it whenever the app is
    // foregrounded with a case still open (after a relaunch, or returning from
    // another screen); stop it if the case is gone — e.g. a duty officer
    // resolved it from the console, so there is no "I'm safe" tap to stop it
    // here. `start()`/`stop()` are idempotent, so this is safe every refresh.
    // (The decoy gate inside `start()`, and the early return above, keep it off
    // under duress.)
    if (open != null) {
      LiveTrackingService.instance.start();
    } else {
      LiveTrackingService.instance.stop();
    }
  }

  /// Stands the user's own alarm down.
  ///
  /// Confirmed first, because it calls off a rescue. And only cleared from the
  /// screen once the console has actually said yes — an optimistic "you're
  /// marked safe" that never left the phone would leave the duty officer still
  /// searching while the user believes they have told everyone otherwise.
  Future<void> _markSafe() async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('ທ່ານປອດໄພແລ້ວບໍ?'),
        content: const Text(
          'ສະຖານທູດຈະປິດເລື່ອງນີ້ ແລະ ຢຸດການຊ່ວຍເຫຼືອ. '
          'ກົດຢືນຢັນສະເພາະເມື່ອທ່ານປອດໄພແທ້ໆ.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('ຍົກເລີກ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('ຢືນຢັນ'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _resolving = true);
    final ok = await CaseService.instance.markSafe();
    // The case is closing — stop volunteering GPS. The tracker would stop on
    // its own within one interval (the server returns open:false), but ending
    // it now means no stray fix lands after the user has said they are safe.
    if (ok) LiveTrackingService.instance.stop();
    if (!mounted) return;
    setState(() => _resolving = false);

    messenger.showSnackBar(
      SnackBar(
        content: Text(ok
            ? 'ແຈ້ງແລ້ວວ່າທ່ານປອດໄພ'
            : 'ສົ່ງບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່ເມື່ອມີສັນຍານ.'),
      ),
    );
    if (ok) _refresh();
  }

  /// Shown only while the user has a case the console still considers open.
  Widget _openCaseBanner(GuardianCase c) {
    final tokens = context.tokens;
    final text = context.text;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: tokens.critical.withAlpha(30),
        borderRadius: SafeZoneTokens.borderRadius,
        border:
            Border.all(color: tokens.critical, width: SafeZoneTokens.ruleHair),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: tokens.critical),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ການແຈ້ງເຫດຂອງທ່ານຍັງເປີດຢູ່', style: text.labelLarge),
                    const SizedBox(height: 2),
                    Text(c.refNo, style: text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _resolving ? null : _markSafe,
              icon: const Icon(Icons.check),
              label: Text(_resolving ? 'ກຳລັງສົ່ງ...' : 'ຂ້ອຍປອດໄພແລ້ວ'),
            ),
          ),
        ],
      ),
    );
  }

  /// Prompts for the identity the embassy needs to act on an SOS. Deliberately
  /// a prompt and not a gate: the app must stay fully usable without it, since
  /// a traveller on a dead SIM cannot verify a phone number.
  Widget _profilePrompt() {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: tokens.high.withAlpha(30),
        borderRadius: SafeZoneTokens.borderRadius,
        border: Border.all(color: tokens.high, width: SafeZoneTokens.ruleHair),
      ),
      child: Row(
        children: [
          Icon(Icons.person_outline, color: tokens.highInk),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ຕື່ມຂໍ້ມູນຂອງທ່ານ', style: text.labelLarge),
                const SizedBox(height: 2),
                Text(
                  'ເພື່ອໃຫ້ສະຖານທູດຊ່ວຍທ່ານໄດ້ເມື່ອກົດ SOS',
                  style: text.bodySmall,
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.chevron_right, color: colors.onSurface),
            onPressed: () async {
              await context.push('/profile');
              _refresh();
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = context.text;
    final onBand = colors.onPrimaryContainer;

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header band. primaryContainer, so it stays navy in light and a
          // deep slate in dark rather than becoming a bright glare band.
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(
              20,
              MediaQuery.of(context).padding.top + 20,
              20,
              24,
            ),
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(SafeZoneTokens.radius),
              ),
            ),
            child: Column(
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    icon: Icon(Icons.lock_outline, color: onBand),
                    tooltip: 'ລັອກ',
                    onPressed: () => AuthService.instance.lock(),
                  ),
                ),
                Icon(Icons.shield_outlined, color: onBand, size: 44),
                const SizedBox(height: 12),
                Text(
                  'SafeZone',
                  style: text.displaySmall!.copyWith(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: onBand,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'ແອັບຊ່ວຍຄົນລາວໃນຕ່າງປະເທດ',
                  style: text.bodyMedium!.copyWith(
                    color: onBand.withAlpha(217),
                  ),
                ),
              ],
            ),
          ),

          // One scroll for the whole page, with SOS as the hero directly under
          // the header.
          //
          // It used to be pinned to the bottom with the dashboard in an
          // Expanded scroll above it. On a 720pt screen the header and the SOS
          // block together left the dashboard about 48pt of viewport, so the
          // status card was sliced through its first row and the rest of the
          // dashboard was unreachable without a scroll nobody would guess was
          // there. Putting SOS first means it is always above the fold — which
          // is the only thing that actually matters — and the dashboard below
          // it can be as tall as it needs to be.
          Expanded(
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),

                      // Above the SOS button on purpose. If an alarm of yours is
                      // still running, standing it down is the one thing more
                      // urgent than raising another.
                      if (_openCase != null) _openCaseBanner(_openCase!),

                      SosButton(
                        onTap: () async {
                          await context.push('/sos');
                          _refresh();
                        },
                      ),

                      const SizedBox(height: 28),

                      if (_needsProfile) _profilePrompt(),

                      // Setup status. Each row is tappable and navigates to the
                      // screen it describes, so the separate "quick action"
                      // tiles that used to sit below were duplicate routes to
                      // the same two places, and are gone.
                      Container(
                        decoration: BoxDecoration(
                          color: colors.surfaceContainer,
                          borderRadius: SafeZoneTokens.borderRadius,
                          border: Border.all(
                            color: colors.outlineVariant,
                            width: SafeZoneTokens.ruleHair,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: Text(
                                'ສະຖານະການຕັ້ງຄ່າ',
                                style:
                                    text.labelMedium!.copyWith(fontSize: 14),
                              ),
                            ),
                            const Divider(),
                            StatusTile(
                              label: 'ພາສປອດ (ເຂົ້າລະຫັດ)',
                              icon: Icons.badge_outlined,
                              isConfigured: _hasPassport,
                              onTap: () async {
                                await context.push('/passport');
                                _refresh();
                              },
                            ),
                            const Divider(),
                            StatusTile(
                              label: 'ຄົນໄວ້ໃຈ',
                              icon: Icons.contact_phone_outlined,
                              isConfigured: _hasContact,
                              onTap: () async {
                                await context.push('/contact');
                                _refresh();
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
