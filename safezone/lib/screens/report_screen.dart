import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/report_content.dart';
import '../theme.dart';
import '../widgets/primary_button.dart';
import '../widgets/safe_card.dart';

/// The Report tab — the app's entry to anti-trafficking reporting, modelled on
/// STOP THE TRAFFIK's STOP APP.
///
/// It teaches "spot the signs" and then hands off to the form. Deliberately not
/// gated in decoy mode: it reveals none of the user's private data, and a tab
/// that vanished under the fake password would itself be a tell.
class ReportScreen extends StatelessWidget {
  const ReportScreen({super.key});

  Future<void> _dial(String number) async {
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(title: const Text('ລາຍງານການຄ້າມະນຸດ')),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // What this is + the anonymity promise.
            SafeCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.volunteer_activism_outlined,
                          color: colors.primary, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text('ຄົນເຮົາ ບໍ່ແມ່ນ ສິນຄ້າ', style: text.titleMedium),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'ຖ້າທ່ານເຫັນ, ໄດ້ຍິນ ຫຼື ສົງໄສວ່າ ມີການຄ້າມະນຸດ — ບອກພວກເຮົາໄດ້ '
                    'ຢ່າງເປັນຄວາມລັບ ແລະ ບໍ່ຕ້ອງໃສ່ຊື່. ບໍ່ຕ້ອງແນ່ໃຈ 100%.',
                    style: text.bodyMedium,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Emergency escape hatch — this is not for immediate danger.
            SafeCard(
              backgroundColor: tokens.critical.withAlpha(20),
              borderColor: tokens.critical,
              child: Row(
                children: [
                  Icon(Icons.emergency_outlined, color: tokens.criticalInk, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'ມີຄົນຕົກຢູ່ໃນອັນຕະລາຍທັນທີບໍ? ໂທ 191 ຫຼື ສາຍດ່ວນ 1300 ທັນທີ.',
                      style: text.bodyMedium,
                    ),
                  ),
                  TextButton(
                    onPressed: () => _dial('191'),
                    child: const Text('ໂທ 191'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            Text('ສັງເກດສັນຍານເຕືອນ', style: text.titleMedium),
            const SizedBox(height: 4),
            Text(
              'ຖ້າມີສິ່ງໜຶ່ງເຮັດໃຫ້ທ່ານສົງໄສ ກໍລາຍງານໄດ້.',
              style: text.bodySmall,
            ),
            const SizedBox(height: 12),

            SafeCard(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
              child: Column(
                children: [
                  for (var i = 0; i < kSpotTheSigns.length; i++) ...[
                    if (i > 0) const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.check_circle_outline,
                              size: 18, color: tokens.successInk),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(kSpotTheSigns[i], style: text.bodyMedium),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 28),

            PrimaryButton(
              label: 'ລາຍງານການຄ້າມະນຸດ',
              icon: Icons.shield_outlined,
              onPressed: () => context.push('/report/new'),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text('ເປັນຄວາມລັບ ແລະ ບໍ່ຕ້ອງໃສ່ຊື່', style: text.bodySmall),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
