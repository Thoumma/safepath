import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme.dart';

/// What SafeZone is, and the numbers to call when the app is not the answer.
///
/// The emergency numbers are the reason this screen earns its place: a printed
/// number the user can dial without any account, network, or GPS is the last
/// fallback when everything else here has failed.
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const _hotlines = [
    ('ຕຳຫຼວດ (ລາວ)', '191'),
    ('ລົດພະຍາບານ (ລາວ)', '195'),
    ('ດັບເພີງ (ລາວ)', '190'),
  ];

  Future<void> _call(String number) async {
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final text = context.text;

    return Scaffold(
      appBar: AppBar(title: const Text('ກ່ຽວກັບ SafeZone')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Icon(Icons.shield_outlined, size: 56, color: colors.primary),
            const SizedBox(height: 16),
            Text(
              'SafeZone',
              textAlign: TextAlign.center,
              style: text.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'ແອັບຊ່ວຍຄົນລາວໃນຕ່າງປະເທດ',
              textAlign: TextAlign.center,
              style: text.bodyMedium,
            ),
            const SizedBox(height: 32),

            _card(
              context,
              title: 'ແອັບນີ້ເຮັດຫຍັງ',
              body: 'SafeZone ເກັບສຳເນົາພາສປອດຂອງທ່ານແບບເຂົ້າລະຫັດໄວ້ໃນເຄື່ອງ '
                  'ແລະ ເມື່ອທ່ານກົດ SOS ມັນຈະສົ່ງຕຳແໜ່ງ GPS ຂອງທ່ານ '
                  'ຫາຜູ້ຊ່ວຍເຫຼືອທີ່ທ່ານຕັ້ງໄວ້ (ທາງ SMS) ແລະ ຫາສະຖານທູດ.',
            ),
            const SizedBox(height: 16),
            _card(
              context,
              title: 'ຄວາມເປັນສ່ວນຕົວ',
              body: 'ພາສປອດຂອງທ່ານຖືກເຂົ້າລະຫັດ AES-256 ແລະ ບໍ່ເຄີຍຖືກເກັບ '
                  'ແບບບໍ່ເຂົ້າລະຫັດ. ກະແຈເກັບຢູ່ໃນ keystore ຂອງເຄື່ອງ. '
                  'SMS ຫາຜູ້ຊ່ວຍເຫຼືອເຮັດວຽກໄດ້ເຖິງແມ່ນບໍ່ມີອິນເຕີເນັດ.',
            ),
            const SizedBox(height: 24),

            Text('ເບີສຸກເສີນ', style: text.titleMedium),
            const SizedBox(height: 12),
            ..._hotlines.map(
              (h) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: SafeZoneTokens.borderRadius,
                    side: BorderSide(
                      color: colors.outlineVariant,
                      width: SafeZoneTokens.ruleHair,
                    ),
                  ),
                  tileColor: colors.surfaceContainer,
                  leading: Icon(Icons.phone_outlined, color: colors.primary),
                  title: Text(h.$1, style: text.bodyLarge),
                  trailing: Text(h.$2, style: text.titleMedium),
                  onTap: () => _call(h.$2),
                ),
              ),
            ),

            const SizedBox(height: 24),
            Center(
              child: Text(
                'ລຸ້ນ 1.0.0',
                style: text.bodySmall!.copyWith(color: colors.outline),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card(BuildContext context, {required String title, required String body}) {
    final colors = context.colors;
    final text = context.text;

    return Container(
      padding: const EdgeInsets.all(16),
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
          Text(title, style: text.titleMedium),
          const SizedBox(height: 6),
          Text(body, style: text.bodyMedium),
        ],
      ),
    );
  }
}
