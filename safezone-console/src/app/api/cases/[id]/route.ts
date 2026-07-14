import { NextResponse } from "next/server";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, PartnerType, CaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// PATCH /api/cases/[id] — update status / routing / responder.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const staff = await requireStaff();

  // Enforce scope: staff can only touch cases they can see.
  const existing = await prisma.case.findFirst({ where: { id: params.id, ...caseScope(staff) } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as {
    status?: CaseStatus;
    routedTo?: PartnerType;
    responderId?: string;
  };

  const data: Prisma.CaseUpdateInput = {};

  if (body.status) {
    data.status = body.status;
    data.resolvedAt = body.status === "RESOLVED" ? new Date() : null;
  }
  if (body.routedTo) {
    data.routedTo = body.routedTo;
    const partner = await prisma.partner.findUnique({ where: { code: body.routedTo } });
    if (partner) data.partner = { connect: { id: partner.id } };
  }
  if (body.responderId) data.responder = { connect: { id: body.responderId } };

  const updated = await prisma.case.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}
