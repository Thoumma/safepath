import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Lock, Clock, User, Users, Building2, Ambulance, Phone,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, PanelTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Annotation } from "@/components/bilingual";
import { SeverityBadge, StatusBadge } from "@/components/tags";
import { CaseActions } from "@/components/case-actions";
import { CaseChat } from "@/components/case-chat";
import { ShareLocationButton } from "@/components/share-location-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { requireStaff, caseScope } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agoLao, initials, cn } from "@/lib/utils";
import type { SeverityKey, StatusKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: { id: string } }) {
  const staff = await requireStaff();

  const c = await prisma.case.findFirst({
    where: { id: params.id, ...caseScope(staff) },
    include: {
      citizen: { include: { contacts: true } },
      partner: true,
      responder: true,
      events: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "desc" }, take: 30 },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) notFound();

  const isOpen = c.status !== "RESOLVED";
  const latestPing = c.locations[0] ?? null;
  // "Live" means an open case whose last fix landed inside two tracking
  // intervals — otherwise the phone is off, out of signal, or done tracking,
  // and a pulsing LIVE badge would overstate what we actually know.
  const lastFixMs = latestPing ? Date.now() - latestPing.createdAt.getTime() : Infinity;
  const isLive = isOpen && lastFixMs < 60_000;
  // The freshest position we hold, and when it was taken.
  const lastLocatedAt = latestPing?.createdAt ?? c.createdAt;

  const responders = c.partnerId
    ? await prisma.responder.findMany({ where: { partnerId: c.partnerId }, select: { id: true, name: true } })
    : [];

  const dob = c.citizen.dob ? c.citizen.dob.toISOString().slice(0, 10) : "—";

  return (
    <>
      <PageHeader lo="ໜ້າ ຊ່ວຍ ຈັດການ ເຄສ" en="Case helper" sub="ເຫັນ ທຸກຢ່າງ ໃນ ໜ້າ ດຽວ — ຊ່ວຍ ໄດ້ ໄວ" />

      {/* Follow an open case's moving GPS without a manual reload. Stops once
          the case is resolved. */}
      <AutoRefresh active={isOpen} seconds={15} />

      <div className="space-y-5 p-6">
        <Link
          href="/admin/inbox"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-4" />
          <span lang="lo" className="font-lao">
            ກັບໄປ Inbox
          </span>
        </Link>

        {/* Case identity. The name is the largest thing here; the ref number is
            mono because it gets read aloud over a phone. */}
        <div className="flex flex-wrap items-start gap-4 border-b border-border-strong pb-5">
          <Avatar className="size-14 text-lg">{initials(c.citizen.fullName)}</Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 lang="lo" className="font-lao text-xl font-bold leading-lao">
                {c.citizen.fullName}
              </h2>
              <SeverityBadge value={c.severity as SeverityKey} />
              <StatusBadge value={c.status as StatusKey} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs tabular-nums text-muted-foreground">
              <span>{c.refNo}</span>
              <span aria-hidden>·</span>
              <span className="font-sans">{c.type}</span>
            </div>
          </div>
        </div>

        <CaseActions
          caseId={c.id}
          status={c.status}
          phone={c.citizen.phone}
          routedTo={c.routedTo}
          responders={responders}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* LEFT: location + connections */}
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <PanelTitle lo="ຕຳແໜ່ງ ປັດຈຸບັນ" en="Live location" />
                {isLive && (
                  <span className="mr-4 inline-flex items-center gap-1.5 rounded-sm bg-critical px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-critical-foreground">
                    <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-critical-foreground" />
                    Live
                  </span>
                )}
              </div>
              <CardContent className="space-y-1">
                {c.lat != null && c.lng != null ? (
                  <iframe
                    title="ຕຳແໜ່ງ ຂອງ ຜູ້ປະສົບໄພ"
                    className="h-64 w-full border border-border"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${c.lng - 0.03}%2C${c.lat - 0.02}%2C${c.lng + 0.03}%2C${c.lat + 0.02}&layer=mapnik&marker=${c.lat}%2C${c.lng}`}
                  />
                ) : (
                  <div
                    lang="lo"
                    className="grid h-64 place-items-center border border-border bg-muted font-lao text-sm text-muted-foreground"
                  >
                    ບໍ່ມີ ຂໍ້ມູນ GPS
                  </div>
                )}
                <div className="pt-2">
                  <Row k="GPS" v={c.lat != null ? `${c.lat}, ${c.lng}` : "—"} mono />
                  <Row k="ສະຖານທີ່" v={[c.city, c.country].filter(Boolean).join(", ") || "—"} />
                  <Row k="ອັບເດດ ຫຼ້າສຸດ" v={`${agoLao(lastLocatedAt)} ຜ່ານມາ`} />
                </div>
                {c.lat != null && c.lng != null && (
                  <ShareLocationButton
                    lat={c.lat}
                    lng={c.lng}
                    name={c.citizen.fullName}
                    refNo={c.refNo}
                  />
                )}
              </CardContent>
            </Card>

            {/* The moving trail. One row per fix the app posted while the case
                was open — newest first, each a link to that exact point. Absent
                entirely for a one-shot SOS that never moved, so it never adds
                empty chrome. */}
            {c.locations.length > 0 && (
              <Card>
                <PanelTitle lo="ເສັ້ນທາງ ຕິດຕາມ ສົດ" en="Tracking trail" />
                <CardContent>
                  <ol className="space-y-px">
                    {c.locations.map((p, i) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn("size-[7px] shrink-0", i === 0 && isLive ? "bg-critical" : "bg-success")}
                          />
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs tabular-nums text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                          >
                            {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                          </a>
                        </div>
                        <span className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                          {agoLao(p.createdAt)} ຜ່ານມາ
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card>
              <PanelTitle lo="ການ ເຊື່ອມຕໍ່ ຂອງ ເຄສ" en="Everything linked" />
              <CardContent className="space-y-px">
                <Conn Icon={User} name={c.citizen.fullName} sub={`ຜູ້ປະສົບໄພ · ${c.citizen.passportNo}`} />
                {c.citizen.contacts.map((ct) => (
                  <Conn
                    key={ct.id}
                    Icon={Users}
                    name={ct.name}
                    sub={`${ct.relation ?? "Trusted contact"} · ${ct.phone}`}
                    phone={ct.phone}
                  />
                ))}
                {c.partner && (
                  <Conn Icon={Building2} name={c.partner.name} sub={`ຮັບຜິດຊອບ · ${c.partner.phone ?? ""}`} phone={c.partner.phone} />
                )}
                {c.responder ? (
                  <Conn Icon={Ambulance} name={c.responder.name} sub={`Responder · ${c.responder.phone ?? ""}`} phone={c.responder.phone} />
                ) : (
                  <Conn Icon={Ambulance} name="ຍັງ ບໍ່ທັນ ມອບໝາຍ" sub="ໃຊ້ ປຸ່ມ ດ້ານເທິງ ເພື່ອ ມອບໝາຍ" muted />
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: victim + timeline */}
          <div className="space-y-4">
            <Card>
              <PanelTitle lo="ຂໍ້ມູນ ຜູ້ປະສົບໄພ" en="Victim & passport" />
              <CardContent>
                <Row k="ຊື່" v={c.citizen.fullName} />
                <Row k="ໜັງສືຜ່ານແດນ" v={c.citizen.passportNo} mono />
                <Row k="ວັນເກີດ" v={dob} mono />
                <Row k="ໂທລະສັບ" v={c.citizen.phone ?? "—"} mono />

                <div className="mt-4 flex items-center gap-3 border border-border bg-muted p-3">
                  <div aria-hidden className="grid h-16 w-12 shrink-0 place-items-center border border-border bg-card">
                    <Lock className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Passport scan</div>
                    <div lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">
                      ສຳເນົາ ເຂົ້າລະຫັດ AES-256
                    </div>
                    <button className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-success px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-success-ink transition-colors duration-fast hover:bg-success hover:text-success-foreground">
                      <Lock aria-hidden className="size-3" /> Decrypt &amp; view
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <PanelTitle lo="ໄທມ໌ໄລນ໌ ການຕອບໂຕ້" en="Response timeline" />
              <CardContent>
                <ol className="relative space-y-4 pl-5">
                  {/* The spine is a rule, like every other structural line. */}
                  <span aria-hidden className="absolute bottom-1 left-[3px] top-1 w-px bg-border" />
                  {c.events.map((e, i) => {
                    const isOpenTip = i === c.events.length - 1 && c.status !== "RESOLVED";
                    return (
                      <li key={e.id} className="relative">
                        <span
                          aria-hidden
                          className={cn(
                            "absolute -left-5 top-1.5 size-[7px]",
                            isOpenTip ? "bg-critical" : "bg-success"
                          )}
                        />
                        <div className="flex items-center gap-1.5 font-mono text-2xs tabular-nums text-muted-foreground">
                          <Clock aria-hidden className="size-3" />
                          {agoLao(e.createdAt)} ຜ່ານມາ
                        </div>
                        <div lang="lo" className="font-lao text-sm leading-lao">
                          {e.message}
                        </div>
                        {e.actor && <Annotation>{e.actor}</Annotation>}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            {/* The conversation, kept separate from the timeline above: one is
                what was *done* (the audit trail), the other is what was
                *said*. */}
            <CaseChat
              caseId={c.id}
              resolved={!isOpen}
              initial={c.messages.map((m) => ({
                id: m.id,
                direction: m.direction,
                body: m.body,
                authorName: m.authorName,
                createdAt: m.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Key/value line. Divided by a hairline, label muted, value in the ink. */
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span lang="lo" className="shrink-0 font-lao leading-lao text-muted-foreground">
        {k}
      </span>
      <span className={cn("min-w-0 truncate text-right font-medium", mono && "font-mono tabular-nums")}>{v}</span>
    </div>
  );
}

function Conn({
  Icon,
  name,
  sub,
  phone,
  muted,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  name: string;
  sub: string;
  phone?: string | null;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 border border-border px-3 py-2.5", muted && "opacity-60")}>
      <div aria-hidden className="grid size-9 shrink-0 place-items-center border border-border bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div lang="lo" className="truncate font-lao text-sm font-semibold leading-lao">
          {name}
        </div>
        <div lang="lo" className="truncate font-lao text-xs leading-lao text-muted-foreground">
          {sub}
        </div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs font-semibold transition-colors duration-fast hover:border-border-strong hover:bg-muted"
        >
          <Phone aria-hidden className="size-3" />
          <span lang="lo" className="font-lao">
            ໂທ
          </span>
        </a>
      )}
    </div>
  );
}
