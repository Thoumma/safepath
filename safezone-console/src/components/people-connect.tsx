"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
const H = 640;

/**
 * The trusted-people network as plain SVG over a d3-force layout.
 *
 * The simulation runs synchronously to a settled state inside useMemo — a
 * static, readable diagram, not a wobbling toy. Filled navy discs are
 * registered citizens; outlined discs are external contacts (phone-only
 * people). A thicker edge is an `isPrimary` designation; an amber edge links
 * two registered citizens — the bridges that reveal real-world groups.
 *
 * Hover dims everything outside the node's immediate neighbourhood; click on
 * a citizen opens them in the Citizens table.
 */
export function PeopleConnect({ nodes, edges }: { nodes: ConnectNode[]; edges: ConnectEdge[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const { simNodes, simLinks } = useMemo(() => {
    const sn: SimNode[] = nodes.map((n) => ({ ...n }));
    const sl: SimLink[] = edges.map((e) => ({ ...e }));
    const sim = forceSimulation(sn)
      .force(
        "link",
        forceLink<SimNode, SimLink>(sl)
          .id((d) => d.id)
          .distance((l) => (l.bridge ? 90 : 60))
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => 14 + Math.min(d.degree, 8) * 2))
      .stop();
    // ~300 ticks ≈ d3's own cooling schedule run to the end, synchronously.
    for (let i = 0; i < 300; i++) sim.tick();
    return { simNodes: sn, simLinks: sl };
  }, [nodes, edges]);

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

  const r = (n: SimNode) => (n.kind === "citizen" ? 10 + Math.min(n.degree, 8) * 1.5 : 6 + Math.min(n.degree, 8) * 1.5);
  const dimmed = (id: string) => neighbourhood !== null && !neighbourhood.has(id);

  return (
    <div className="relative overflow-hidden rounded-sm border border-border bg-card">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[36rem] w-full cursor-grab touch-none select-none active:cursor-grabbing"
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
              className={n.kind === "citizen" ? "cursor-pointer" : undefined}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (n.kind === "citizen") {
                  router.push(`/admin/citizens?q=${encodeURIComponent(n.label)}`);
                }
              }}
            >
              <circle
                r={r(n)}
                fill={n.kind === "citizen" ? "hsl(var(--primary))" : "hsl(var(--card))"}
                stroke={n.kind === "citizen" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                strokeWidth={n.kind === "citizen" ? 0 : 1.5}
              />
              <text
                y={r(n) + 12}
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

      {/* Hover details — name, phone, and how many people rely on them. */}
      {hoveredNode && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-sm border border-border bg-card/95 px-3 py-2 shadow-sm">
          <div lang="lo" className="font-lao text-sm font-semibold leading-lao">
            {hoveredNode.label}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {hoveredNode.kind === "citizen" ? (
              <span lang="lo" className="font-lao">
                ພົນລະເມືອງ ລົງທະບຽນ
              </span>
            ) : (
              <span lang="lo" className="font-lao">
                ຜູ້ຕິດຕໍ່ ພາຍນອກ
              </span>
            )}
            {hoveredNode.phone && <span className="ml-2 font-mono">{hoveredNode.phone}</span>}
          </div>
          <div className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            {hoveredNode.degree} <span lang="lo" className="font-lao">ສາຍພົວພັນ</span>
          </div>
        </div>
      )}

      {/* Legend, bilingual like every chart in the console. */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5">
        <LegendSwatch className="bg-primary" lo="ພົນລະເມືອງ" en="Citizen" />
        <LegendSwatch className="border-2 border-muted-foreground bg-card" lo="ຜູ້ຕິດຕໍ່ ພາຍນອກ" en="External contact" />
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
