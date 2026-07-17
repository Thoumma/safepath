import { PrismaClient, Severity, CaseStatus, PartnerType } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SafeZone Console...");

  // Clean (dev only)
  await db.caseEvent.deleteMany();
  await db.case.deleteMany();
  await db.trustedContact.deleteMany();
  await db.responder.deleteMany();
  await db.citizen.deleteMany();
  await db.partner.deleteMany();

  // --- Partners ---
  const embassy = await db.partner.create({
    data: { code: PartnerType.EMBASSY, name: "ສະຖານທູດ ລາວ · Bangkok", phone: "+6622221234" },
  });
  const vfi = await db.partner.create({
    data: { code: PartnerType.VFI, name: "VFI Anti-Trafficking Unit", phone: "+6620009999" },
  });
  const safepath = await db.partner.create({
    data: { code: PartnerType.SAFEPATH, name: "SafePath NGO · KL", phone: "+60312345678" },
  });

  const decha = await db.responder.create({ data: { name: "ທ. Decha", phone: "+66811112222", partnerId: vfi.id } });
  const aziz = await db.responder.create({ data: { name: "ທ. Aziz", phone: "+60199998888", partnerId: safepath.id } });

  // --- Citizens + contacts ---
  const khamla = await db.citizen.create({
    data: {
      fullName: "ນາງ ຄຳຫລ້າ ພົມມະ", passportNo: "P1234567", dob: new Date("1994-03-12"),
      phone: "+8562099887766", homeProvince: "Vientiane Capital",
      contacts: { create: [{ name: "ທ. ບຸນມີ ພົມມະ", phone: "+8562055443322", relation: "ຜົວ", isPrimary: true }] },
    },
  });
  const somphone = await db.citizen.create({
    data: {
      fullName: "ທ. ສົມພອນ ໄຊຍະ", passportNo: "P7788990", dob: new Date("1990-07-01"),
      phone: "+8562077665544", homeProvince: "Savannakhet",
      contacts: { create: [{ name: "ນາງ ວັນນາ ໄຊຍະ", phone: "+8562011223344", relation: "ເອື້ອຍ", isPrimary: true }] },
    },
  });
  const mani = await db.citizen.create({
    data: {
      fullName: "ນາງ ມະນີ ຈັນທະວົງ", passportNo: "P4455667", dob: new Date("1998-11-22"),
      phone: "+8562088990011", homeProvince: "Champasak",
      contacts: { create: [{ name: "ນາງ ດາລາ", phone: "+601122334455", relation: "ໝູ່", isPrimary: true }] },
    },
  });
  const kaysone = await db.citizen.create({
    data: {
      fullName: "ທ. ໄກສອນ ວົງສາ", passportNo: "P2233445", dob: new Date("1985-05-30"),
      phone: "+8562066554433", homeProvince: "Luang Prabang",
      contacts: { create: [{ name: "ນາງ ພອນ", phone: "+8562033221100", relation: "ພັນລະຍາ", isPrimary: true }] },
    },
  });
  // A few safe travellers for the directory
  const extraCitizens = [];
  for (const c of [
    { fullName: "ນາງ ສີດາ ແກ້ວ", passportNo: "P5566778", homeProvince: "Vientiane" },
    { fullName: "ທ. ຄຳຜາຍ ພິມມະສອນ", passportNo: "P9900112", homeProvince: "Xieng Khouang" },
    { fullName: "ນາງ ໄໝ ພັນທະ", passportNo: "P3344556", homeProvince: "Bokeo" },
    { fullName: "ທ. ວິໄລ ສີສຸພັນ", passportNo: "P6677889", homeProvince: "Oudomxay" },
    { fullName: "ນາງ ນາລີ ວໍລະຈິດ", passportNo: "P1122334", homeProvince: "Khammouane" },
    { fullName: "ທ. ພູວົງ ແສງອາລຸນ", passportNo: "P8899001", homeProvince: "Salavan" },
  ]) {
    extraCitizens.push(await db.citizen.create({ data: c }));
  }

  // --- Cases ---
  const c1 = await db.case.create({
    data: {
      refNo: "SOS-2026-0713-014", citizenId: khamla.id, severity: Severity.CRITICAL, status: CaseStatus.NEW,
      type: "ອຸບັດຕິເຫດ / Accident", city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534,
      routedTo: PartnerType.EMBASSY, partnerId: embassy.id,
      events: {
        create: [
          { kind: "sos", message: "🚨 ກົດ SOS ຈາກ ແອັບ SafeZone", actor: "ອຸປະກອນ" },
          { kind: "note", message: "📍 ສົ່ງ GPS + ສຳເນົາ passport ໃຫ້ Trusted Contact", actor: "ລະບົບ" },
          { kind: "call", message: "📞 Trusted contact ຮັບຮູ້ ແລ້ວ", actor: "ບຸນມີ ພົມມະ" },
        ],
      },
    },
  });
  await db.case.create({
    data: {
      refNo: "SOS-2026-0713-013", citizenId: somphone.id, severity: Severity.HIGH, status: CaseStatus.IN_PROGRESS,
      type: "ຄາດ ຄ້າມະນຸດ / Trafficking risk", city: "Poipet", country: "KH", lat: 13.656, lng: 102.556,
      routedTo: PartnerType.VFI, partnerId: vfi.id, responderId: decha.id,
      events: {
        create: [
          { kind: "sos", message: "🚨 SOS ຈາກ ແອັບ", actor: "ອຸປະກອນ" },
          { kind: "route", message: "🔁 ສົ່ງຕໍ່ ຫາ VFI (ຄາດ ຄ້າມະນຸດ)", actor: "Duty officer" },
          { kind: "assign", message: "🚗 Responder Decha ຮັບເຄສ ແລະ ກຳລັງ ໄປ (ETA 25 ນທ)", actor: "VFI" },
        ],
      },
    },
  });
  await db.case.create({
    data: {
      refNo: "SOS-2026-0713-011", citizenId: mani.id, severity: Severity.MEDIUM, status: CaseStatus.IN_PROGRESS,
      type: "ເຈັບປ່ວຍ / Medical", city: "Kuala Lumpur", country: "MY", lat: 3.149, lng: 101.698,
      routedTo: PartnerType.SAFEPATH, partnerId: safepath.id, responderId: aziz.id,
      events: {
        create: [
          { kind: "sos", message: "🚨 SOS ຈາກ ແອັບ", actor: "ອຸປະກອນ" },
          { kind: "route", message: "🔁 ສົ່ງຕໍ່ ຫາ SafePath KL", actor: "Duty officer" },
          { kind: "assign", message: "🏥 ພາ ໄປ ໂຮງໝໍ Gleneagles", actor: "Aziz" },
          { kind: "note", message: "🩺 ກຳລັງ ກວດ — ອາການ ຄົງທີ່", actor: "SafePath" },
        ],
      },
    },
  });
  await db.case.create({
    data: {
      refNo: "SOS-2026-0712-009", citizenId: kaysone.id, severity: Severity.MEDIUM, status: CaseStatus.RESOLVED,
      type: "ເອກະສານ ເສຍ / Lost documents", city: "Chiang Mai", country: "TH", lat: 18.788, lng: 98.985,
      routedTo: PartnerType.EMBASSY, partnerId: embassy.id, resolvedAt: new Date(),
      events: {
        create: [
          { kind: "sos", message: "🚨 SOS — passport ຖືກ ລັກ", actor: "ອຸປະກອນ" },
          { kind: "note", message: "📄 ອອກ Emergency Travel Doc", actor: "Consular" },
          { kind: "resolve", message: "✅ ປິດ ເຄສ", actor: "Somsak V." },
        ],
      },
    },
  });

  // --- Bulk cases for the threat map -------------------------------------
  // A realistic regional spread so per-city percentages mean something:
  // trafficking clusters at the known border / scam-center corridors (routed
  // to VFI), everything else across the ordinary consular geography.
  const TYPES = {
    trafficking: "ຄາດ ຄ້າມະນຸດ / Trafficking risk",
    accident: "ອຸບັດຕິເຫດ / Accident",
    medical: "ເຈັບປ່ວຍ / Medical",
    lostDocs: "ເອກະສານ ເສຍ / Lost documents",
  } as const;

  type BulkCase = {
    city: string; country: string; lat: number; lng: number;
    type: string; severity: Severity; status: CaseStatus;
    routedTo: PartnerType; daysAgo: number;
  };

  const S = Severity, C = CaseStatus, P = PartnerType;
  const bulkCases: BulkCase[] = [
    // Trafficking corridors → VFI (14 total incl. the handcrafted Poipet case)
    { city: "Poipet", country: "KH", lat: 13.656, lng: 102.556, type: TYPES.trafficking, severity: S.CRITICAL, status: C.NEW, routedTo: P.VFI, daysAgo: 1 },
    { city: "Poipet", country: "KH", lat: 13.656, lng: 102.556, type: TYPES.trafficking, severity: S.HIGH, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 5 },
    { city: "Poipet", country: "KH", lat: 13.656, lng: 102.556, type: TYPES.trafficking, severity: S.HIGH, status: C.RESOLVED, routedTo: P.VFI, daysAgo: 19 },
    { city: "Myawaddy", country: "MM", lat: 16.689, lng: 98.509, type: TYPES.trafficking, severity: S.CRITICAL, status: C.NEW, routedTo: P.VFI, daysAgo: 2 },
    { city: "Myawaddy", country: "MM", lat: 16.689, lng: 98.509, type: TYPES.trafficking, severity: S.CRITICAL, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 8 },
    { city: "Myawaddy", country: "MM", lat: 16.689, lng: 98.509, type: TYPES.trafficking, severity: S.HIGH, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 12 },
    { city: "Mae Sot", country: "TH", lat: 16.713, lng: 98.575, type: TYPES.trafficking, severity: S.HIGH, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 6 },
    { city: "Mae Sot", country: "TH", lat: 16.713, lng: 98.575, type: TYPES.trafficking, severity: S.MEDIUM, status: C.RESOLVED, routedTo: P.VFI, daysAgo: 24 },
    { city: "Sihanoukville", country: "KH", lat: 10.627, lng: 103.522, type: TYPES.trafficking, severity: S.CRITICAL, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 3 },
    { city: "Sihanoukville", country: "KH", lat: 10.627, lng: 103.522, type: TYPES.trafficking, severity: S.HIGH, status: C.NEW, routedTo: P.VFI, daysAgo: 1 },
    { city: "Sihanoukville", country: "KH", lat: 10.627, lng: 103.522, type: TYPES.trafficking, severity: S.HIGH, status: C.RESOLVED, routedTo: P.VFI, daysAgo: 28 },
    { city: "Ton Pheung", country: "LA", lat: 20.245, lng: 100.096, type: TYPES.trafficking, severity: S.CRITICAL, status: C.IN_PROGRESS, routedTo: P.VFI, daysAgo: 4 },
    { city: "Ton Pheung", country: "LA", lat: 20.245, lng: 100.096, type: TYPES.trafficking, severity: S.HIGH, status: C.RESOLVED, routedTo: P.VFI, daysAgo: 21 },
    // Bangkok — biggest non-trafficking cluster (5 new + handcrafted accident)
    { city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534, type: TYPES.accident, severity: S.HIGH, status: C.IN_PROGRESS, routedTo: P.EMBASSY, daysAgo: 7 },
    { city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534, type: TYPES.accident, severity: S.MEDIUM, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 15 },
    { city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534, type: TYPES.medical, severity: S.MEDIUM, status: C.IN_PROGRESS, routedTo: P.EMBASSY, daysAgo: 3 },
    { city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534, type: TYPES.lostDocs, severity: S.LOW, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 11 },
    { city: "Bangkok", country: "TH", lat: 13.746, lng: 100.534, type: TYPES.lostDocs, severity: S.LOW, status: C.NEW, routedTo: P.EMBASSY, daysAgo: 0 },
    // The rest of the consular geography
    { city: "Chiang Mai", country: "TH", lat: 18.788, lng: 98.985, type: TYPES.accident, severity: S.MEDIUM, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 17 },
    { city: "Pattaya", country: "TH", lat: 12.936, lng: 100.889, type: TYPES.accident, severity: S.HIGH, status: C.NEW, routedTo: P.EMBASSY, daysAgo: 1 },
    { city: "Udon Thani", country: "TH", lat: 17.413, lng: 102.787, type: TYPES.medical, severity: S.MEDIUM, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 26 },
    { city: "Kuala Lumpur", country: "MY", lat: 3.149, lng: 101.698, type: TYPES.medical, severity: S.MEDIUM, status: C.IN_PROGRESS, routedTo: P.SAFEPATH, daysAgo: 9 },
    { city: "Kuala Lumpur", country: "MY", lat: 3.149, lng: 101.698, type: TYPES.lostDocs, severity: S.LOW, status: C.RESOLVED, routedTo: P.SAFEPATH, daysAgo: 20 },
    { city: "Phnom Penh", country: "KH", lat: 11.556, lng: 104.928, type: TYPES.medical, severity: S.MEDIUM, status: C.IN_PROGRESS, routedTo: P.EMBASSY, daysAgo: 5 },
    { city: "Phnom Penh", country: "KH", lat: 11.556, lng: 104.928, type: TYPES.lostDocs, severity: S.LOW, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 14 },
    { city: "Ho Chi Minh City", country: "VN", lat: 10.776, lng: 106.7, type: TYPES.lostDocs, severity: S.LOW, status: C.RESOLVED, routedTo: P.EMBASSY, daysAgo: 23 },
    { city: "Seoul", country: "KR", lat: 37.566, lng: 126.978, type: TYPES.medical, severity: S.MEDIUM, status: C.IN_PROGRESS, routedTo: P.EMBASSY, daysAgo: 10 },
  ];

  const allCitizens = [khamla, somphone, mani, kaysone, ...extraCitizens];
  const partnerIdOf = { EMBASSY: embassy.id, VFI: vfi.id, SAFEPATH: safepath.id } as const;

  let seq = 100;
  for (const b of bulkCases) {
    const createdAt = new Date(Date.now() - b.daysAgo * 864e5);
    const mmdd = `${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}`;
    await db.case.create({
      data: {
        refNo: `SOS-${createdAt.getFullYear()}-${mmdd}-${String(seq++).padStart(3, "0")}`,
        citizenId: allCitizens[seq % allCitizens.length].id,
        severity: b.severity,
        status: b.status,
        type: b.type,
        city: b.city,
        country: b.country,
        lat: b.lat,
        lng: b.lng,
        routedTo: b.routedTo,
        partnerId: partnerIdOf[b.routedTo],
        responderId: b.routedTo === PartnerType.VFI ? decha.id : b.routedTo === PartnerType.SAFEPATH ? aziz.id : null,
        createdAt,
        resolvedAt: b.status === CaseStatus.RESOLVED ? new Date(createdAt.getTime() + 36e5 * 6) : null,
        events: { create: [{ kind: "sos", message: "🚨 SOS ຈາກ ແອັບ", actor: "ອຸປະກອນ", createdAt }] },
      },
    });
  }

  console.log(`✅ Seeded: 3 partners, ${await db.citizen.count()} citizens, ${await db.case.count()} cases.`);
  console.log("ℹ️  Create matching Supabase Auth users, then insert staff_users rows (see README).");
  void c1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
