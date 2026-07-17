import { prisma } from "@/lib/prisma";
import { caseScope } from "@/lib/auth";
import type { StaffUser } from "@prisma/client";
import type { CaseListItem } from "@/lib/types";
import type { SeverityKey, StatusKey, PartnerKey } from "@/lib/constants";

/** Scoped list of cases for a staff member, newest first, serialized. */
export async function listCases(staff: StaffUser): Promise<CaseListItem[]> {
  const rows = await prisma.case.findMany({
    where: caseScope(staff),
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { citizen: { select: { fullName: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    refNo: c.refNo,
    citizenName: c.citizen.fullName,
    severity: c.severity as SeverityKey,
    status: c.status as StatusKey,
    type: c.type,
    city: c.city,
    country: c.country,
    routedTo: (c.routedTo as PartnerKey) ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

export type CaseMapRow = {
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  type: string;
};

/** Geo rows for the threat map — lean on purpose (no CaseListItem bloat,
 *  which feeds the realtime inbox and /api/cases). Same role scope as
 *  everything else: a PARTNER maps only their routed cases. */
export async function listCaseMapRows(staff: StaffUser): Promise<CaseMapRow[]> {
  return prisma.case.findMany({
    where: { ...caseScope(staff), lat: { not: null }, lng: { not: null } },
    select: { city: true, country: true, lat: true, lng: true, type: true },
  });
}
