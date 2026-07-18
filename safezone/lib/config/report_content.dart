import 'package:flutter/material.dart';

/// Anti-trafficking taxonomy + awareness copy for the Report tab.
///
/// This mirrors the console's `src/lib/trafficking-signs.ts` by hand — the app
/// can't import TypeScript, so the two must be kept in step. `key` values MUST
/// match the console API's category allow-list
/// (labour | sexual | domestic | child | forced_marriage | other).
class ReportCategory {
  final String key;
  final String lo;
  final String en;
  final String hintLo;
  final IconData icon;

  const ReportCategory({
    required this.key,
    required this.lo,
    required this.en,
    required this.hintLo,
    required this.icon,
  });
}

const List<ReportCategory> kReportCategories = [
  ReportCategory(
    key: 'labour',
    lo: 'ແຮງງານບັງຄັບ',
    en: 'Forced labour',
    hintLo: 'ຖືກບັງຄັບໃຫ້ເຮັດວຽກ ໂດຍບໍ່ໄດ້ຮັບຄ່າຈ້າງ ຫຼື ອອກໄປບໍ່ໄດ້.',
    icon: Icons.engineering_outlined,
  ),
  ReportCategory(
    key: 'sexual',
    lo: 'ການຄ້າປະເວນີ',
    en: 'Sexual exploitation',
    hintLo: 'ຖືກບັງຄັບ ຫຼື ຫຼອກລວງ ເຂົ້າສູ່ການຄ້າປະເວນີ.',
    icon: Icons.person_off_outlined,
  ),
  ReportCategory(
    key: 'domestic',
    lo: 'ຮັບໃຊ້ໃນເຮືອນ',
    en: 'Domestic servitude',
    hintLo: 'ຖືກກັກຂັງໃຫ້ຮັບໃຊ້ໃນເຮືອນ ໂດຍບໍ່ມີອິດສະຫຼະ.',
    icon: Icons.home_outlined,
  ),
  ReportCategory(
    key: 'child',
    lo: 'ການຄ້າເດັກ',
    en: 'Child trafficking',
    hintLo: 'ເດັກຖືກໃຊ້ແຮງງານ, ຄ້າປະເວນີ ຫຼື ຂໍທານ.',
    icon: Icons.child_care_outlined,
  ),
  ReportCategory(
    key: 'forced_marriage',
    lo: 'ການແຕ່ງງານບັງຄັບ',
    en: 'Forced marriage',
    hintLo: 'ຖືກບັງຄັບໃຫ້ແຕ່ງງານໂດຍບໍ່ຍິນຍອມ.',
    icon: Icons.heart_broken_outlined,
  ),
  ReportCategory(
    key: 'other',
    lo: 'ອື່ນໆ / ບໍ່ແນ່ໃຈ',
    en: 'Other / not sure',
    hintLo: 'ບໍ່ແນ່ໃຈວ່າແມ່ນປະເພດໃດ — ລາຍງານໄດ້ຄືກັນ.',
    icon: Icons.help_outline,
  ),
];

/// General "spot the signs" indicators shown on the Report tab.
const List<String> kSpotTheSigns = [
  'ເບິ່ງຄືຖືກຄວບຄຸມ ຫຼື ອອກໄປໄດ້ບໍ່ອິດສະຫຼະ',
  'ບໍ່ໄດ້ຖືໜັງສືຜ່ານແດນ ຫຼື ເອກະສານຂອງຕົນເອງ',
  'ມີຮ່ອງຮອຍຖືກທຳຮ້າຍ ຫຼື ເບິ່ງຄືຢ້ານກົວ',
  'ເປັນໜີ້ກ້ອນໃຫຍ່ ຫຼື ອອກຈາກວຽກບໍ່ໄດ້',
  'ບໍ່ໄດ້ຮັບຄ່າຈ້າງ ຫຼື ໄດ້ໜ້ອຍຫຼາຍ',
  'ຕິດຕໍ່ກັບຄອບຄົວ ໝູ່ເພື່ອນ ໄດ້ໜ້ອຍ ຫຼື ບໍ່ໄດ້ເລີຍ',
];
