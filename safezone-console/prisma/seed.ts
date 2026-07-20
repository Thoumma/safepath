import { PrismaClient, Severity, CaseStatus, PartnerType } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SafeZone Console...");

  // Clean (dev only). Location tables first: they cascade anyway, but an
  // explicit order documents what this wipes. Trafficking reports are NOT
  // touched — they are real public submissions, not fixtures.
  await db.journeyLocation.deleteMany();
  await db.caseLocation.deleteMany();
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

  // The number you verify with in the app (registered as a Supabase *test*
  // phone number, so no SMS is ever sent). It is attached to the citizen who
  // has the open CRITICAL case, so a real device that logs in with it lands
  // straight on a live case: open-case banner, live tracking, chat thread, and
  // one guardian who lists this number. Override without editing code:
  //   DEMO_PHONE=+8562055512345 npm run db:seed
  const DEMO_PHONE = process.env.DEMO_PHONE ?? "+856209690898";

  // --- Citizens + contacts ---
  const khamla = await db.citizen.create({
    data: {
      fullName: "ນາງ ຄຳຫລ້າ ພົມມະ", passportNo: "P1234567", dob: new Date("1994-03-12"),
      phone: DEMO_PHONE, homeProvince: "Vientiane Capital",
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
  // A few safe travellers for the directory. Phones matter: a trusted contact
  // whose number matches a citizen's is what turns two separate lists into a
  // *connection* on the People Connect graph.
  const extraCitizens = [];
  for (const c of [
    { fullName: "ນາງ ສີດາ ແກ້ວ", passportNo: "P5566778", phone: "+8562012341234", homeProvince: "Vientiane" },
    { fullName: "ທ. ຄຳຜາຍ ພິມມະສອນ", passportNo: "P9900112", phone: "+8562023452345", homeProvince: "Xieng Khouang" },
    { fullName: "ນາງ ໄໝ ພັນທະ", passportNo: "P3344556", phone: "+8562034563456", homeProvince: "Bokeo" },
    { fullName: "ທ. ວິໄລ ສີສຸພັນ", passportNo: "P6677889", phone: "+8562045674567", homeProvince: "Oudomxay" },
    { fullName: "ນາງ ນາລີ ວໍລະຈິດ", passportNo: "P1122334", phone: "+8562056785678", homeProvince: "Khammouane" },
    { fullName: "ທ. ພູວົງ ແສງອາລຸນ", passportNo: "P8899001", phone: "+8562067896789", homeProvince: "Salavan" },
  ]) {
    extraCitizens.push(await db.citizen.create({ data: c }));
  }
  const [sida, khamphay, mai, vilai, nali, phouvong] = extraCitizens;

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

  // Five travellers are reserved as *safe and journey-sharing* (see the
  // journey block below) and so must never be handed a bulk case: a person
  // cannot be calmly sharing a trip and be an open emergency at once.
  const journeySharers = [sida, vilai, nali, khamphay, phouvong];
  const sharerIds = new Set(journeySharers.map((c) => c.id));
  const allCitizens = [khamla, somphone, mani, kaysone, ...extraCitizens].filter(
    (c) => !sharerIds.has(c.id)
  );
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

  // ── The trusted-contact network (People Connect) ──────────────────────────
  //
  // Three shapes, because a graph of only one shape teaches nothing:
  //  1. BRIDGES — a contact whose phone is itself a registered citizen. This is
  //     the edge that says "these two travellers know each other".
  //  2. HUBS — one phone listed by several citizens (a recruiter, an employer,
  //     a village coordinator). On the graph they collapse into a single node
  //     with many spokes, which is exactly the pattern an analyst hunts for.
  //  3. LEAVES — ordinary family contacts, one per person.
  const contactRows: { citizenId: string; name: string; phone: string; relation: string; isPrimary?: boolean }[] = [
    // 1. Citizen ↔ citizen bridges.
    { citizenId: khamla.id, name: "ທ. ສົມພອນ ໄຊຍະ", phone: somphone.phone!, relation: "ອ້າຍ" },
    { citizenId: mani.id, name: "ທ. ໄກສອນ ວົງສາ", phone: kaysone.phone!, relation: "ລູກພີ່ລູກນ້ອງ" },
    { citizenId: sida.id, name: "ນາງ ຄຳຫລ້າ ພົມມະ", phone: khamla.phone!, relation: "ໝູ່ຮ່ວມງານ", isPrimary: true },
    { citizenId: vilai.id, name: "ນາງ ໄໝ ພັນທະ", phone: mai.phone!, relation: "ໝູ່", isPrimary: true },
    { citizenId: nali.id, name: "ທ. ຄຳຜາຍ ພິມມະສອນ", phone: khamphay.phone!, relation: "ອ້າຍ", isPrimary: true },
    { citizenId: khamphay.id, name: "ນາງ ນາລີ ວໍລະຈິດ", phone: nali.phone!, relation: "ນ້ອງສາວ" },

    // 2. Hub A — one "employment agent" listed by five travellers. The shape a
    //    duty officer should be able to see at a glance.
    ...[khamla, somphone, mani, sida, mai].map((c) => ({
      citizenId: c.id,
      name: "ທ. ບຸນຍັງ (ນາຍໜ້າ)",
      phone: "+66850001111",
      relation: "ນາຍໜ້າ",
    })),

    // 3. Hub B — a Bangkok employer shared by three.
    ...[kaysone, vilai, phouvong].map((c) => ({
      citizenId: c.id,
      name: "Mae Noi (ນາຍຈ້າງ)",
      phone: "+66899990000",
      relation: "ນາຍຈ້າງ",
    })),

    // 4. Hub C — a home-village coordinator shared by two.
    ...[nali, khamphay].map((c) => ({
      citizenId: c.id,
      name: "ນາງ ບົວ (ນາຍບ້ານ)",
      phone: "+8562070707070",
      relation: "ນາຍບ້ານ",
    })),

    // 5. Ordinary family leaves.
    { citizenId: sida.id, name: "ນາງ ຈັນ ແກ້ວ", phone: "+8562090909090", relation: "ແມ່" },
    { citizenId: mai.id, name: "ທ. ສຸກ ພັນທະ", phone: "+8562091919191", relation: "ພໍ່", isPrimary: true },
    { citizenId: vilai.id, name: "ນາງ ຄຳ ສີສຸພັນ", phone: "+8562092929292", relation: "ແມ່" },
    { citizenId: phouvong.id, name: "ນາງ ອຳໄພ", phone: "+8562093939393", relation: "ພັນລະຍາ", isPrimary: true },
    { citizenId: khamphay.id, name: "ນາງ ສົມສີ", phone: "+8562094949494", relation: "ແມ່" },
  ];
  for (const row of contactRows) {
    await db.trustedContact.create({ data: { ...row, isPrimary: row.isPrimary ?? false } });
  }

  // ── Journey sharing + live trails ─────────────────────────────────────────
  //
  // `journeySharing` alone does not put anyone on a map: every viewer checks
  // *freshness* (a fix within the last 2h). So the fixtures below deliberately
  // include one stale sharer, which must NOT appear — that is the rule working.
  const min = 60_000;
  const journeys: { citizen: { id: string }; agoMin: number; route: [number, number][] }[] = [
    // Savannakhet → the Thai border at Mukdahan. Streaming right now.
    {
      citizen: sida,
      agoMin: 0.5,
      route: [
        [16.5560, 104.7520], [16.5601, 104.7398], [16.5648, 104.7301],
        [16.5702, 104.7205], [16.5761, 104.7118], [16.5824, 104.7040],
      ],
    },
    // Inside Bangkok — Victory Monument toward Chatuchak. Live.
    {
      citizen: vilai,
      agoMin: 1,
      route: [
        [13.7650, 100.5380], [13.7712, 100.5364], [13.7788, 100.5351],
        [13.7869, 100.5340], [13.7952, 100.5331], [13.8031, 100.5325],
      ],
    },
    // Vientiane → the Friendship Bridge. Fresh, but not "live" (18 min).
    {
      citizen: nali,
      agoMin: 18,
      route: [
        [17.9757, 102.6331], [17.9601, 102.6520], [17.9440, 102.6702],
        [17.9282, 102.6890], [17.9131, 102.7075],
      ],
    },
    // Kuala Lumpur, 70 minutes old: on the map, but plainly not live.
    {
      citizen: khamphay,
      agoMin: 70,
      route: [
        [3.1390, 101.6869], [3.1451, 101.6950], [3.1518, 101.7031], [3.1580, 101.7110],
      ],
    },
    // Stale on purpose (5h): sharing is still ON, but every viewer must drop
    // this person — a phone that died mid-journey may not pin a ghost forever.
    {
      citizen: phouvong,
      agoMin: 300,
      route: [
        [14.8820, 105.8300], [14.8901, 105.8395], [14.8988, 105.8480],
      ],
    },
  ];

  for (const j of journeys) {
    const last = j.route[j.route.length - 1];
    // Points are spaced a minute apart, ending `agoMin` ago — the same shape
    // the app's 60s journey timer produces.
    await db.journeyLocation.createMany({
      data: j.route.map((p, i) => ({
        citizenId: j.citizen.id,
        lat: p[0],
        lng: p[1],
        createdAt: new Date(Date.now() - (j.agoMin + (j.route.length - 1 - i)) * min),
      })),
    });
    await db.citizen.update({
      where: { id: j.citizen.id },
      data: {
        journeySharing: true,
        journeyLat: last[0],
        journeyLng: last[1],
        lastJourneyAt: new Date(Date.now() - j.agoMin * min),
      },
    });
  }

  // A person cannot sensibly be "on a calm journey" and "in an emergency" at
  // the same time — two pins for one human reads as a bug. The emergency wins.
  const inTrouble = await db.case.findMany({
    where: { status: { in: [CaseStatus.NEW, CaseStatus.IN_PROGRESS] } },
    select: { citizenId: true },
  });
  await db.citizen.updateMany({
    where: { id: { in: inTrouble.map((c) => c.citizenId) } },
    data: { journeySharing: false, journeyLat: null, journeyLng: null, lastJourneyAt: null },
  });

  // ── Live GPS trails on the open SOS cases ────────────────────────────────
  // So the console live map shows a moving person, not a frozen dot.
  const openWithGps = await db.case.findMany({
    where: { status: { in: [CaseStatus.NEW, CaseStatus.IN_PROGRESS] }, lat: { not: null } },
    select: { id: true, lat: true, lng: true },
    take: 6,
  });
  for (const c of openWithGps) {
    // Walk backwards from the case's current position so the newest breadcrumb
    // agrees with Case.lat/lng, exactly as `/api/me/case/track` maintains it.
    const steps = 8;
    await db.caseLocation.createMany({
      data: Array.from({ length: steps }, (_, i) => {
        const back = steps - 1 - i; // 7 … 0
        return {
          caseId: c.id,
          lat: c.lat! - back * 0.0032,
          lng: c.lng! - back * 0.0026,
          createdAt: new Date(Date.now() - (back * 2 + 1) * min),
        };
      }),
    });
  }

  const sharingCount = await db.citizen.count({ where: { journeySharing: true } });
  console.log(
    `✅ Seeded: 3 partners, ${await db.citizen.count()} citizens, ${await db.case.count()} cases, ` +
      `${await db.trustedContact.count()} trusted contacts, ${sharingCount} sharing a journey, ` +
      `${await db.journeyLocation.count()} journey points, ${await db.caseLocation.count()} case points.`
  );
  console.log("ℹ️  Create matching Supabase Auth users, then insert staff_users rows (see README).");
  void c1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
