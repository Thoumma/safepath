import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import '../widgets/primary_button.dart';
import '../widgets/safe_card.dart';

/// First-run welcome. The old flow dropped a brand-new user straight into a
/// password form with no idea what SafeZone is or why there are *two* passwords.
/// This introduces the app — and, most importantly, teaches the duress password
/// — before that form. Shown only while no account exists (see the router
/// redirect); once setup completes it is unreachable.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;
    final onBand = colors.onPrimaryContainer;

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header band, matching Home's navy identity.
          Container(
            padding: EdgeInsets.fromLTRB(
                24, MediaQuery.of(context).padding.top + 40, 24, 32),
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(SafeZoneTokens.radius),
              ),
            ),
            child: Column(
              children: [
                Icon(Icons.shield_outlined, color: onBand, size: 48),
                const SizedBox(height: 14),
                Text(
                  'SafeZone',
                  style: text.displaySmall!.copyWith(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: onBand,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'ແອັບຊ່ວຍປົກປ້ອງຄົນລາວໃນຕ່າງປະເທດ',
                  textAlign: TextAlign.center,
                  style: text.bodyMedium!.copyWith(color: onBand.withAlpha(217)),
                ),
              ],
            ),
          ),

          Expanded(
            child: SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  _feature(
                    context,
                    icon: Icons.sos_outlined,
                    color: tokens.criticalInk,
                    title: 'ປຸ່ມ SOS',
                    body: 'ກົດເທື່ອດຽວ ສົ່ງຕຳແໜ່ງ GPS ຂອງທ່ານໃຫ້ຄົນໄວ້ໃຈ ແລະ '
                        'ສະຖານທູດ ຜ່ານ 2 ຊ່ອງທາງ ເຖິງແມ່ນບໍ່ມີເນັດ.',
                  ),
                  const SizedBox(height: 14),
                  _feature(
                    context,
                    icon: Icons.badge_outlined,
                    color: colors.primary,
                    title: 'ຕູ້ເກັບພາສປອດ',
                    body: 'ເກັບສຳເນົາພາສປອດຂອງທ່ານ ໂດຍເຂົ້າລະຫັດໄວ້ໃນເຄື່ອງ '
                        'ຢ່າງດຽວ — ບໍ່ມີໃຜເຫັນໄດ້ ນອກຈາກທ່ານ.',
                  ),
                  const SizedBox(height: 14),
                  _feature(
                    context,
                    icon: Icons.vpn_key_outlined,
                    color: tokens.highInk,
                    title: 'ລະຫັດປອມ (ສຸກເສີນ)',
                    body: 'ຖ້າຖືກບັງຄັບໃຫ້ເປີດແອັບ ໃຫ້ໃສ່ “ລະຫັດປອມ” — ມັນຈະເປີດ '
                        'ຕູ້ເປົ່າ ແລະ ສົ່ງສັນຍານຂໍຊ່ວຍແບບງຽບໆ.',
                  ),
                  const SizedBox(height: 14),
                  _feature(
                    context,
                    icon: Icons.campaign_outlined,
                    color: colors.primary,
                    title: 'ລາຍງານການຄ້າມະນຸດ',
                    body: 'ເຫັນ ຫຼື ສົງໄສ ການຄ້າມະນຸດ? ລາຍງານໄດ້ຢ່າງເປັນຄວາມລັບ '
                        'ແລະ ບໍ່ຕ້ອງໃສ່ຊື່.',
                  ),
                  const SizedBox(height: 32),
                  PrimaryButton(
                    label: 'ເລີ່ມນຳໃຊ້',
                    icon: Icons.arrow_forward,
                    onPressed: () => context.go('/setup'),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Text(
                      'ຂັ້ນຕໍ່ໄປ: ຕັ້ງລະຫັດຜ່ານຂອງທ່ານ',
                      style: text.bodySmall,
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

  Widget _feature(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String body,
  }) {
    final text = context.text;
    return SafeCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: text.titleMedium),
                const SizedBox(height: 4),
                Text(body, style: text.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
