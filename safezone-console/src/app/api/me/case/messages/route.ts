import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, appAuthErrorResponse } from "@/lib/app-auth";

export const dynamic = "force-dynamic";

const OPEN = ["NEW", "IN_PROGRESS"] as const;
const MAX_BODY = 2000;

/**
 * The citizen's side of the case thread.
 *
 * ## Why DURESS cases are excluded (the same rule as `/api/me/case`)
 *
 * The device must never learn that a duress case exists. In decoy mode the app
 * does not call this at all — its chat service is gated — but this filter is
 * the second lock, and the RLS policy in `supabase/chat_policies.sql` is the
 * third. If a coerced phone could open a thread with the embassy about the
 * silent alarm it just fired, the decoy vault would be worthless.
 *
 * Both verbs resolve the case the same way every `/api/me/*` route does: the
 * newest open case belonging to the *verified* phone claim, never an id from
 * the request.
 */
async function openCaseFor(phone: string) {
  return prisma.case.findFirst({
    where: {
      citizen: { phone },
      status: { in: [...OPEN] },
      type: { not: "DURESS" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export async function GET(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const c = await openCaseFor(caller.phone);
  // No open case is an ordinary outcome, not an error: the thread simply does
  // not exist yet. The app renders an empty screen, never a failure.
  if (!c) return NextResponse.json({ messages: [], unread: 0, open: false }, { status: 200 });

  const messages = await prisma.caseMessage.findMany({
    where: { caseId: c.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, direction: true, body: true, authorName: true, createdAt: true },
  });

  // Fetching the thread is what "read" means for the citizen.
  await prisma.caseMessage.updateMany({
    where: { caseId: c.id, direction: "FROM_STAFF", readByCitizenAt: null },
    data: { readByCitizenAt: new Date() },
  });

  return NextResponse.json({ messages, unread: 0, open: true }, { status: 200 });
}

export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireAppUser(req);
  } catch (e) {
    const res = appAuthErrorResponse(e);
    if (res) return res;
    throw e;
  }

  const b = (await req.json()) as { body?: string; clientId?: string; composedAt?: string };
  const body = (b.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (body.length > MAX_BODY) {
    return NextResponse.json({ error: "body too long" }, { status: 400 });
  }

  const c = await openCaseFor(caller.phone);
  // Tell the app to stop trying rather than to retry forever: with no open
  // case there is nothing to attach the message to, and a queued message that
  // can never land would sit in the outbox indefinitely.
  if (!c) return NextResponse.json({ open: false }, { status: 200 });

  const createdAt =
    b.composedAt && !Number.isNaN(new Date(b.composedAt).getTime())
      ? new Date(b.composedAt)
      : new Date();

  // Idempotent on the app-generated clientId, so flushing the offline outbox
  // twice cannot post the same message twice. Unlike a GPS fix, message text
  // legitimately repeats — "ok" twice is two real messages — so dedupe has to
  // be by explicit id, never by content.
  const message = b.clientId
    ? await prisma.caseMessage.upsert({
        where: { caseId_clientId: { caseId: c.id, clientId: b.clientId } },
        create: {
          caseId: c.id,
          direction: "FROM_CITIZEN",
          body,
          clientId: b.clientId,
          createdAt,
        },
        update: {}, // a retry must not rewrite the original
        select: { id: true, createdAt: true },
      })
    : await prisma.caseMessage.create({
        data: { caseId: c.id, direction: "FROM_CITIZEN", body, createdAt },
        select: { id: true, createdAt: true },
      });

  return NextResponse.json({ open: true, message }, { status: 201 });
}
