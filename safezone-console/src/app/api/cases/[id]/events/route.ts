import { NextResponse } from "next/server";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/cases/[id]/events — append a timeline entry.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const staff = await requireStaff();

  const found = await prisma.case.findFirst({ where: { id: params.id, ...caseScope(staff) } });
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { kind = "note", message } = (await req.json()) as { kind?: string; message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  const event = await prisma.caseEvent.create({
    data: { caseId: params.id, kind, message, actor: staff.fullName ?? staff.email },
  });
  return NextResponse.json(event, { status: 201 });
}
