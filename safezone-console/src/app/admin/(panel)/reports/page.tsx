import Link from "next/link";
import { MapPin, Clock, Mail, Flag, Globe, Smartphone, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EvidencePhotos } from "@/components/evidence-photos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { photosEnabled, signedUrl } from "@/lib/report-storage";
import { REPORT_STATUS, type ReportStatusKey } from "@/lib/constants";
import { REPORT_CATEGORIES } from "@/lib/trafficking-signs";
import { agoLao, cn } from "@/lib/utils";
import { updateReport } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY = Object.fromEntries(REPORT_CATEGORIES.map((c) => [c.key, c]));
const FILTERS: { key: string; lo: string }[] = [
  { key: "open", lo: "ຍັງເປີດ" },
  { key: "NEW", lo: "ໃໝ່" },
  { key: "REVIEWING", lo: "ກຳລັງກວດ" },
  { key: "ACTIONED", lo: "ດຳເນີນການແລ້ວ" },
  { key: "DISMISSED", lo: "ຍົກເລີກ" },
  { key: "all", lo: "ທັງໝົດ" },
];

export default async function ReportsTriagePage({ searchParams }: { searchParams: { status?: string } }) {
  await requireStaff();
  const filter = searchParams.status ?? "open";

  const where =
    filter === "all"
      ? {}
      : filter === "open"
        ? { status: { in: ["NEW", "REVIEWING"] as ReportStatusKey[] } }
        : { status: filter as ReportStatusKey };

  const reports = await prisma.traffikReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Sign each report's evidence paths for staff viewing (short-lived URLs).
  // Only touch storage when photos are configured; broken paths sign to null.
  //
  // 30 minutes, not the 10-minute default: this is a queue an officer keeps
  // open while working through it, and a URL that expires under them turns
  // evidence into a broken image with no explanation. Still short enough that
  // a leaked link dies quickly.
  const PHOTO_URL_TTL_SEC = 30 * 60;
  const photosById = new Map<string, string[]>();
  if (photosEnabled()) {
    await Promise.all(
      reports
        .filter((r) => r.photoUrls.length > 0)
        .map(async (r) => {
          const urls = (
            await Promise.all(r.photoUrls.map((p) => signedUrl(p, PHOTO_URL_TTL_SEC)))
          ).filter((u): u is string => Boolean(u));
          if (urls.length) photosById.set(r.id, urls);
        })
    );
  }

  return (
    <>
      <PageHeader lo="ລາຍງານ ການຄ້າມະນຸດ" en="Trafficking tips" sub="ລາຍງານ ຈາກ ປະຊາຊົນ ແລະ ແອັບ" />

      <div className="space-y-4 p-6">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Link
                key={f.key}
                href={f.key === "open" ? "/admin/reports" : `/admin/reports?status=${f.key}`}
                className={cn(
                  "rounded-sm border px-3 py-1.5 font-lao text-sm leading-lao transition-colors duration-fast",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
              >
                {f.lo}
              </Link>
            );
          })}
        </div>

        {reports.length === 0 ? (
          <div className="grid place-items-center border border-border bg-card py-16">
            <Flag aria-hidden className="size-8 text-muted-foreground" />
            <p lang="lo" className="mt-3 font-lao text-sm leading-lao text-muted-foreground">
              ບໍ່ມີ ລາຍງານ ໃນ ໝວດ ນີ້
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const cat = CATEGORY[r.category];
              const st = REPORT_STATUS[r.status as ReportStatusKey];
              const place = [r.locationText, r.city, r.country].filter(Boolean).join(", ");
              return (
                <li key={r.id} className="border border-border bg-card">
                  <div className="flex flex-col gap-4 p-5 lg:flex-row">
                    {/* Left: the report */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn(st.badge)}>
                          <span lang="lo" className="font-lao">{st.lo}</span>
                        </Badge>
                        <span lang="lo" className="font-lao text-sm font-semibold leading-lao">
                          {cat?.lo ?? r.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground">
                          {r.source === "MOBILE_APP" ? <Smartphone className="size-3" /> : <Globe className="size-3" />}
                          {r.source === "MOBILE_APP" ? "App" : "Web"}
                        </span>
                        {/* Evidence count earns a place in the header row: a
                            tip with photos is worth opening first. */}
                        {(photosById.get(r.id)?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-2xs text-muted-foreground">
                            <ImageIcon aria-hidden className="size-3" />
                            <span className="font-mono tabular-nums">{photosById.get(r.id)!.length}</span>
                            <span lang="lo" className="font-lao">ຫຼັກຖານ</span>
                          </span>
                        )}
                        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">{r.refNo}</span>
                      </div>

                      <p lang="lo" className="mt-3 whitespace-pre-wrap font-lao text-sm leading-lao">
                        {r.description}
                      </p>

                      <EvidencePhotos urls={photosById.get(r.id) ?? []} refNo={r.refNo} />

                      {/* The reporter attached evidence but this deployment
                          cannot serve it. Silence here would read as "no
                          photos" and an officer would never go looking. */}
                      {r.photoUrls.length > 0 && !photosById.get(r.id) && (
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                          <ImageIcon aria-hidden className="size-3.5 shrink-0" />
                          <span lang="lo" className="font-lao leading-lao">
                            ມີ {r.photoUrls.length} ຮູບ ແຕ່ ເປີດ ບໍ່ ໄດ້ — ບ່ອນ ເກັບ ຮູບ ຍັງ ບໍ່ ໄດ້ ຕັ້ງຄ່າ
                          </span>
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                        {place && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin aria-hidden className="size-3.5" />
                            <span lang="lo" className="font-lao leading-lao">{place}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden className="size-3.5" />
                          <span lang="lo" className="font-lao leading-lao">{agoLao(r.createdAt)} ຜ່ານມາ</span>
                        </span>
                        {r.observedAt && (
                          <span className="inline-flex items-center gap-1.5">
                            <span lang="lo" className="font-lao leading-lao">
                              ເຫັນເມື່ອ {r.observedAt.toISOString().slice(0, 10)}
                            </span>
                          </span>
                        )}
                        {r.reporterContact && (
                          <a href={`mailto:${r.reporterContact}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                            <Mail aria-hidden className="size-3.5" />
                            <span className="font-mono">{r.reporterContact}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right: triage action */}
                    <form
                      action={updateReport}
                      className="flex w-full shrink-0 flex-col gap-2 border-t border-border pt-4 lg:w-64 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <label lang="lo" className="font-lao text-xs font-semibold leading-lao text-muted-foreground">
                        ສະຖານະ
                      </label>
                      <select
                        name="status"
                        defaultValue={r.status}
                        className="h-9 w-full rounded-sm border border-border bg-card px-2 text-sm focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {(Object.keys(REPORT_STATUS) as ReportStatusKey[]).map((k) => (
                          <option key={k} value={k}>
                            {REPORT_STATUS[k].en}
                          </option>
                        ))}
                      </select>
                      <Textarea
                        name="reviewNote"
                        rows={2}
                        defaultValue={r.reviewNote ?? ""}
                        placeholder="ບັນທຶກ (ພາຍໃນ)"
                        className="text-sm"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        <span lang="lo" className="font-lao">ບັນທຶກ</span>
                      </Button>
                      {r.reviewedBy && (
                        <span className="text-2xs text-muted-foreground">ໂດຍ {r.reviewedBy}</span>
                      )}
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
