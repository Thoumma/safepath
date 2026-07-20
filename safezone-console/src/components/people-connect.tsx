"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users2, Link2, Maximize2 } from "lucide-react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { ConnectEdge, ConnectNode } from "@/lib/connect-graph";
import { cn } from "@/lib/utils";

type SimNode = ConnectNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & Omit<ConnectEdge, "source" | "target">;

const W = 960;
const H = 620;

/** "Links many people" thresholds — the filter that surfaces recruiters,
 *  employers and coordinators out of a wall of family contacts. */
const MIN_LINK_STEPS = [1, 2, 3, 5] as const;

/**
 * The trusted-people network as plain SVG over a d3-force layout.
 *
 * The graph alone is a hairball once there are more than a few dozen people,
 * so the controls are the feature, not decoration: filter to people who link
 * *many* others (hubs are how trafficking networks actually show up in this
 * data), isolate citizen↔citizen bridges, or search a name and see only that
 * person's immediate circle.
 *
 * The simulation runs synchronously to a settled state inside useMemo — a
 * static, readable diagram, not a wobbling toy — and re-runs when the filters
 * change the node set.
 */
export function PeopleConnect({ nodes, edges }: { nodes: ConnectNode[]; edges: ConnectEdge[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [minLinks, setMinLinks] = useState<number>(1);
  const [onlyBridges, setOnlyBridges] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  // Who connects the most people — the answer to "show me the hubs".
  const topConnectors = useMemo(
    () => [...nodes].filter((n) => n.degree > 1).sort((a, b) => b.degree - a.degree).slice(0, 6),
    [nodes]
  );

  // ── Filtering, before layout so the simulation only lays out what is shown.
  const { viewNodes, viewEdges } = useMemo(() => {
    let keptEdges = edges;
    if (onlyBridges) keptEdges = keptEdges.filter((e) => e.bridge);

    const q = query.trim().toLowerCase();
    let keepIds: Set<string> | null = null;

    if (focused) {
      // A focused person: them plus everyone they touch.
      keepIds = new Set([focused]);
      for (const e of keptEdges) {
        if (e.source === focused) keepIds.add(e.target);
        if (e.target === focused) keepIds.add(e.source);
      }
    } else if (q) {
      // Search: matches plus their immediate circle, so a hit has context.
      const matches = nodes.filter(
        (n) => n.label.toLowerCase().includes(q) || (n.phone ?? "").toLowerCase().includes(q)
      );
      keepIds = new Set(matches.map((m) => m.id));
      for (const e of keptEdges) {
        if (keepIds.has(e.source)) keepIds.add(e.target);
        else if (keepIds.has(e.target)) keepIds.add(e.source);
      }
    }

    const byMin = (n: ConnectNode) => n.degree >= minLinks;
    let keptNodes = nodes.filter((n) => byMin(n) && (!keepIds || keepIds.has(n.id)));
    const nodeIds = new Set(keptNodes.map((n) => n.id));
    keptEdges = keptEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Drop anyone left with no visible link — an unconnected dot on a network
    // diagram is noise. (Unless nothing is filtered at all.)
    if (onlyBridges || minLinks > 1 || keepIds) {
      const linked = new Set<string>();
      for (const e of keptEdges) {
        linked.add(e.source);
        linked.add(e.target);
      }
      keptNodes = keptNodes.filter((n) => linked.has(n.id) || n.id === focused);
    }

    return { viewNodes: keptNodes, viewEdges: keptEdges };
  }, [nodes, edges, query, minLinks, onlyBridges, focused]);

  const { simNodes, simLinks } = useMemo(() => {
    const sn: SimNode[] = viewNodes.map((n) => ({ ...n }));
    const sl: SimLink[] = viewEdges.map((e) => ({ ...e }));
    const sim = forceSimulation(sn)
      .force(
        "link",
        forceLink<SimNode, SimLink>(sl)
          .id((d) => d.id)
          .distance((l) => (l.bridge ? 95 : 65))
      )
      .force("charge", forceManyBody().strength(-140))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => 16 + Math.min(d.degree, 8) * 2))
      .stop();
    for (let i = 0; i < 300; i++) sim.tick();
    return { simNodes: sn, simLinks: sl };
  }, [viewNodes, viewEdges]);

  const neighbourhood = useMemo(() => {
    if (!hovered) return null;
    const keep = new Set<string>([hovered]);
    for (const l of simLinks) {
      const s = (l.source as SimNode).id;
      const t = (l.target as SimNode).id;
      if (s === hovered) keep.add(t);
      if (t === hovered) keep.add(s);
    }
    return keep;
  }, [hovered, simLinks]);

  const hoveredNode = hovered ? simNodes.find((n) => n.id === hovered) : null;
  const filtering = Boolean(query.trim()) || minLinks > 1 || onlyBridges || focused;

  const reset = useCallback(() => {
    setQuery("");
    setMinLinks(1);
    setOnlyBridges(false);
    setFocused(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Esc clears the current focus/search — the usual way out of a filtered view.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && filtering) reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtering, reset]);

  function onWheel(e: React.WheelEvent) {
    setZoom((z) => Math.min(4, Math.max(0.4, z * (e.deltaY < 0 ? 1.15 : 0.87))));
  }
  function onPointerDown(e: React.PointerEvent) {
    dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setPan({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
  }
  function onPointerUp() {
    dragging.current = null;
  }

  const r = (n: SimNode) =>
    (n.kind === "citizen" ? 10 : 6) + Math.min(n.degree, 8) * 1.5;
  const dimmed = (id: string) => neighbourhood !== null && !neighbourhood.has(id);

  return (
    <div className="space-y-3">
      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocused(null);
            }}
            aria-label="ຄົ້ນຫາ ຊື່ ຫຼື ເບີໂທ"
            placeholder="ຄົ້ນຫາ ຊື່ / ເບີໂທ..."
            className="h-9 w-56 rounded-sm border border-border bg-card pl-8 pr-3 font-lao text-sm placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        {/* "Links many people" — the hub filter. */}
        <div className="flex items-center gap-1 rounded-sm border border-border bg-card p-0.5">
          <span lang="lo" className="px-2 font-lao text-xs leading-lao text-muted-foreground">
            ເຊື່ອມ ຢ່າງໜ້ອຍ
          </span>
          {MIN_LINK_STEPS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={minLinks === n}
              onClick={() => setMinLinks(n)}
              className={cn(
                "min-w-8 rounded-sm px-2 py-1 font-mono text-xs tabular-nums transition-colors duration-fast",
                minLinks === n
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {n === 1 ? "ທັງໝົດ" : `${n}+`}
            </button>
          ))}
        </div>

        <FilterChip active={onlyBridges} onClick={() => setOnlyBridges((v) => !v)} icon={<Link2 className="size-3.5" />}>
          ສະເພາະ ພົນລະເມືອງ ↔ ພົນລະເມືອງ
        </FilterChip>

        {filtering && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-fast hover:border-border-strong hover:text-foreground"
          >
            <X className="size-3.5" />
            <span lang="lo" className="font-lao leading-lao">ລ້າງ ຕົວກອງ</span>
          </button>
        )}

        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {viewNodes.length}/{nodes.length} · {viewEdges.length} <span lang="lo" className="font-lao">ເສັ້ນ</span>
        </span>
      </div>

      {/* Top connectors — one click isolates that person's whole circle. */}
      {topConnectors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-muted/40 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users2 aria-hidden className="size-3.5" />
            <span lang="lo" className="font-lao leading-lao">ເຊື່ອມ ຫຼາຍ ຄົນ ທີ່ສຸດ</span>
          </span>
          {topConnectors.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setQuery("");
                setMinLinks(1);
                setFocused((f) => (f === n.id ? null : n.id));
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 transition-colors duration-fast",
                focused === n.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-border-strong"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  n.kind === "citizen" ? "bg-primary" : "bg-high",
                  focused === n.id && "bg-primary-foreground"
                )}
              />
              <span lang="lo" className="font-lao text-xs leading-lao">{n.label}</span>
              <span className="font-mono text-2xs tabular-nums opacity-70">{n.degree}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Graph ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-sm border border-border bg-card">
        {simNodes.length === 0 ? (
          <p
            lang="lo"
            className="grid h-[38rem] place-items-center px-6 text-center font-lao text-sm leading-lao text-muted-foreground"
          >
            ບໍ່ພົບ ຄົນ ຕາມ ຕົວກອງ ນີ້ — ລອງ ຫຼຸດ ຈຳນວນ ການເຊື່ອມ ຫຼື ລ້າງ ຕົວກອງ
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[38rem] w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label="People Connect network graph"
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} transform-origin={`${W / 2} ${H / 2}`}>
              {simLinks.map((l, i) => {
                const s = l.source as SimNode;
                const t = l.target as SimNode;
                const dim = neighbourhood !== null && !(neighbourhood.has(s.id) && neighbourhood.has(t.id));
                return (
                  <line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={l.bridge ? "hsl(var(--high))" : "hsl(var(--border))"}
                    strokeWidth={l.isPrimary ? 2.5 : 1.2}
                    strokeOpacity={dim ? 0.12 : l.bridge ? 0.9 : 0.7}
                  />
                );
              })}
              {simNodes.map((n) => (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  opacity={dimmed(n.id) ? 0.18 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    // Citizens open their record; a shared contact isolates its
                    // circle, which is the whole point of spotting a hub.
                    if (n.kind === "citizen") {
                      router.push(`/admin/citizens?q=${encodeURIComponent(n.label)}`);
                    } else {
                      setFocused((f) => (f === n.id ? null : n.id));
                    }
                  }}
                >
                  <circle
                    r={r(n)}
                    fill={n.kind === "citizen" ? "hsl(var(--primary))" : "hsl(var(--card))"}
                    stroke={n.kind === "citizen" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={n.kind === "citizen" ? 0 : 1.5}
                  />
                  {/* A contact linking 3+ travellers gets a ring — the shape
                      that should catch an analyst's eye without a click. */}
                  {n.kind === "contact" && n.degree >= 3 && (
                    <circle r={r(n) + 4} fill="none" stroke="hsl(var(--high))" strokeWidth={1.5} strokeOpacity={0.9} />
                  )}
                  <text
                    y={r(n) + 13}
                    textAnchor="middle"
                    className="font-lao"
                    fontSize={11}
                    fill="hsl(var(--foreground))"
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {n.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        )}

        {hoveredNode && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-sm border border-border bg-card/95 px-3 py-2 shadow-sm">
            <div lang="lo" className="font-lao text-sm font-semibold leading-lao">
              {hoveredNode.label}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span lang="lo" className="font-lao">
                {hoveredNode.kind === "citizen" ? "ພົນລະເມືອງ ລົງທະບຽນ" : "ຜູ້ຕິດຕໍ່ ພາຍນອກ"}
              </span>
              {hoveredNode.phone && <span className="ml-2 font-mono">{hoveredNode.phone}</span>}
            </div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              {hoveredNode.degree} <span lang="lo" className="font-lao">ສາຍພົວພັນ</span>
            </div>
          </div>
        )}

        {focused && (
          <button
            type="button"
            onClick={() => setFocused(null)}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors duration-fast hover:border-border-strong hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
            <span lang="lo" className="font-lao leading-lao">ເບິ່ງ ທັງໝົດ</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5">
          <LegendSwatch className="bg-primary" lo="ພົນລະເມືອງ" en="Citizen" />
          <LegendSwatch className="border-2 border-muted-foreground bg-card" lo="ຜູ້ຕິດຕໍ່ ພາຍນອກ" en="External contact" />
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 shrink-0 rounded-full border-2 border-high" />
            <LegendText lo="ເຊື່ອມ 3+ ຄົນ" en="Hub (3+ links)" />
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-5 shrink-0 bg-high" />
            <LegendText lo="ພົນລະເມືອງ ↔ ພົນລະເມືອງ" en="Citizen bridge" />
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-[3px] w-5 shrink-0 bg-border" />
            <LegendText lo="ຜູ້ຕິດຕໍ່ ຫຼັກ" en="Primary contact" />
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 transition-colors duration-fast",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
      )}
    >
      {icon}
      <span lang="lo" className="font-lao text-xs leading-lao">
        {children}
      </span>
    </button>
  );
}

function LegendSwatch({ className, lo, en }: { className: string; lo: string; en: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-3 shrink-0 rounded-full", className)} />
      <LegendText lo={lo} en={en} />
    </span>
  );
}

function LegendText({ lo, en }: { lo: string; en: string }) {
  return (
    <>
      <span lang="lo" className="font-lao text-xs leading-lao">
        {lo}
      </span>
      <span className="annotation">{en}</span>
    </>
  );
}
