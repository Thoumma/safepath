import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { listCases } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/cases — scoped list for the logged-in staff member (used by the
// realtime inbox to refetch when a `cases` change is broadcast).
export async function GET() {
  const staff = await requireStaff();
  return NextResponse.json(await listCases(staff));
}
