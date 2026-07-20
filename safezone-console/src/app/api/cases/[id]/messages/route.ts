import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, caseScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Longest message we accept. Long enough for real instructions ("go to the
 *  Thai immigration office on the west side, ask for..."), short enough that
 *  the field cannot be used as a file transfer. */
const MAX_BODY = 2000;

/**
 * The duty officer's side of the case thread.
 *
 * Scoped with `caseScope` exactly like every other staff route: a PARTNER
 * account can only ever read or write the thread of a case routed to their
 * organisation. The scope is nested (`where: { case: { ...caseScope } }`)
 * because it is a `Prisma.CaseWhereInput`, not a message filter.
 */
async function scopedCase(id: string) {
  const staff = await requireStaff();
  const found = await prisma.case.findFirst({
    where: { id, ...caseScope(staff) },
    select: { id: true, status: true },
  });
  return { staff, found };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { found } = await scopedCase(params.id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const messages = await prisma.caseMessage.findMany({
    where: { caseId: params.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      direction: true,
      body: true,
      authorName: true,
      createdAt: true,
      readByCitizenAt: true,
    },
  });

  // Opening the thread is what "read" means for staff. Done on GET rather than
  // on POST so simply looking at the case clears the unread badge.
  await prisma.caseMessage.updateMany({
    where: { caseId: params.id, direction: "FROM_CITIZEN", readByStaffAt: null },
    data: { readByStaffAt: new Date() },
  });

  return NextResponse.json({ messages }, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { staff, found } = await scopedCase(params.id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  // A resolved case is a closed conversation. Refusing here matters because
  // the citizen's app stops polling the thread once their case closes — a
  // message sent now would never be read by anyone.
  if (found.status === "RESOLVED") {
    return NextResponse.json({ error: "case resolved" }, { status: 409 });
  }

  const b = (await req.json()) as { body?: string };
  const body = (b.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (body.length > MAX_BODY) {
    return NextResponse.json({ error: "body too long" }, { status: 400 });
  }

  const message = await prisma.caseMessage.create({
    data: {
      caseId: params.id,
      direction: "FROM_STAFF",
      body,
      staffId: staff.id,
      authorName: staff.fullName ?? staff.email,
    },
    select: { id: true, direction: true, body: true, authorName: true, createdAt: true },
  });

  return NextResponse.json({ message }, { status: 201 });
}
