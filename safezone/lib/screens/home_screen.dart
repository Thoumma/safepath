import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';
import '../services/auth_service.dart';
import '../services/contact_store.dart';
import '../services/passport_store.dart';
import '../services/profile_store.dart';
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

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    // In decoy (duress) mode the dashboard shows nothing configured, so the
    // real passport/contact are never revealed. The profile prompt is hidden
    // too — offering to "complete your profile" would tell an attacker that a
    // real profile exists somewhere behind another password.
    if (AuthService.instance.isDecoy) {
      if (mounted) {
        setState(() {
          _hasPassport = false;
          _hasContact = false;
          _needsProfile = false;
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

                      SosButton(
                        onTap: () => context.push('/sos'),
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
                              label: 'ພາສປອດ (encrypted)',
                              icon: Icons.badge_outlined,
                              isConfigured: _hasPassport,
                              onTap: () async {
                                await context.push('/passport');
                                _refresh();
                              },
                            ),
                            const Divider(),
                            StatusTile(
                              label: 'Trusted Contact',
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
