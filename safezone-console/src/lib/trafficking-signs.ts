/**
 * Anti-trafficking awareness + report taxonomy, shared by the public website
 * (Home awareness section + Report form) and — mirrored by hand — the mobile
 * app's Report tab. Lao carries the meaning; English rides beneath as the
 * annotation, matching the rest of the product.
 *
 * `key` values MUST match the API's category allow-list in
 * `src/app/api/report/route.ts` (labour | sexual | domestic | child |
 * forced_marriage | other).
 *
 * Indicators are adapted from Polaris and the National Human Trafficking
 * Hotline. Not diagnostic — the presence or absence of any sign is not proof;
 * the point is to lower the bar to *reporting a suspicion*.
 */
export type ReportCategory = {
  key: "labour" | "sexual" | "domestic" | "child" | "forced_marriage" | "other";
  lo: string;
  en: string;
  /** lucide-react icon name, resolved to a component at the use site. */
  icon: string;
  hintLo: string;
  hintEn: string;
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: "labour",
    lo: "ແຮງງານບັງຄັບ",
    en: "Forced labour",
    icon: "HardHat",
    hintLo: "ຖືກບັງຄັບໃຫ້ເຮັດວຽກ ໂດຍບໍ່ໄດ້ຮັບຄ່າຈ້າງ ຫຼື ອອກໄປບໍ່ໄດ້.",
    hintEn: "Made to work through threats, debt, or with no freedom to leave.",
  },
  {
    key: "sexual",
    lo: "ການຄ້າປະເວນີ",
    en: "Sexual exploitation",
    icon: "UserX",
    hintLo: "ຖືກບັງຄັບ ຫຼື ຫຼອກລວງ ເຂົ້າສູ່ການຄ້າປະເວນີ.",
    hintEn: "Forced or coerced into commercial sex.",
  },
  {
    key: "domestic",
    lo: "ຮັບໃຊ້ໃນເຮືອນ",
    en: "Domestic servitude",
    icon: "Home",
    hintLo: "ຖືກກັກຂັງໃຫ້ຮັບໃຊ້ໃນເຮືອນ ໂດຍບໍ່ມີອິດສະຫຼະ.",
    hintEn: "Trapped working in a private home, unable to leave.",
  },
  {
    key: "child",
    lo: "ການຄ້າເດັກ",
    en: "Child trafficking",
    icon: "Baby",
    hintLo: "ເດັກຖືກໃຊ້ແຮງງານ, ຄ້າປະເວນີ ຫຼື ຂໍທານ.",
    hintEn: "A child used for labour, sex, or begging.",
  },
  {
    key: "forced_marriage",
    lo: "ການແຕ່ງງານບັງຄັບ",
    en: "Forced marriage",
    icon: "HeartCrack",
    hintLo: "ຖືກບັງຄັບໃຫ້ແຕ່ງງານໂດຍບໍ່ຍິນຍອມ.",
    hintEn: "Made to marry against their will.",
  },
  {
    key: "other",
    lo: "ອື່ນໆ / ບໍ່ແນ່ໃຈ",
    en: "Other / not sure",
    icon: "HelpCircle",
    hintLo: "ບໍ່ແນ່ໃຈວ່າແມ່ນປະເພດໃດ — ລາຍງານໄດ້ຄືກັນ.",
    hintEn: "Not sure which — report it anyway.",
  },
];

/** General "spot the signs" indicators — the Home awareness section. */
export const SPOT_THE_SIGNS: { lo: string; en: string }[] = [
  {
    lo: "ເບິ່ງຄືຖືກຄວບຄຸມ ຫຼື ບໍ່ສາມາດອອກໄປໄດ້ຢ່າງອິດສະຫຼະ",
    en: "Appears controlled or not free to come and go",
  },
  {
    lo: "ບໍ່ໄດ້ຖືໜັງສືຜ່ານແດນ ຫຼື ເອກະສານຂອງຕົນເອງ",
    en: "Has no control of their own passport or ID",
  },
  {
    lo: "ມີຮ່ອງຮອຍຖືກທຳຮ້າຍ ຫຼື ເບິ່ງຄືຢ້ານກົວ ວິຕົກກັງວົນ",
    en: "Signs of abuse, or seems fearful and anxious",
  },
  {
    lo: "ເປັນໜີ້ກ້ອນໃຫຍ່ ຫຼື ອອກຈາກວຽກບໍ່ໄດ້",
    en: "Bonded by a large debt, or cannot leave a job",
  },
  {
    lo: "ບໍ່ໄດ້ຮັບຄ່າຈ້າງ ຫຼື ໄດ້ໜ້ອຍຫຼາຍ",
    en: "Not paid, or paid very little",
  },
  {
    lo: "ຕິດຕໍ່ກັບຄອບຄົວ ໝູ່ເພື່ອນ ໄດ້ໜ້ອຍ ຫຼື ບໍ່ໄດ້ເລີຍ",
    en: "Little or no contact with family or friends",
  },
  {
    lo: "ຢູ່ ຫຼື ເຮັດວຽກ ໃນສະພາບແວດລ້ອມທີ່ບໍ່ປອດໄພ",
    en: "Lives or works in poor, unsafe conditions",
  },
  {
    lo: "ບໍ່ຮູ້ວ່າຕົນເອງຢູ່ໃສ ຫຼື ບໍ່ຖືເງິນຂອງຕົນເອງ",
    en: "Unsure where they are, or holds no money of their own",
  },
];
