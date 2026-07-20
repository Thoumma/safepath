"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Evidence photos on the trafficking-tip triage queue.
 *
 * These are the images an officer has to actually *read* — a face, a plate, a
 * shop sign, a room. The old 80px thumbnail that dumped a raw signed URL into
 * a new browser tab lost the report context and the officer's place in the
 * queue. So the full view happens here, over the page, and closes back to
 * exactly where they were.
 *
 * Deliberately hand-rolled rather than pulling in a lightbox dependency: the
 * console has no dialog primitive yet, and the whole interaction is one
 * overlay, two arrows and a zoom.
 *
 * The URLs are short-lived signed URLs minted server-side (see
 * `lib/report-storage.ts`); this component never sees a storage path and
 * cannot reach the bucket itself.
 */
export function EvidencePhotos({ urls, refNo }: { urls: string[]; refNo: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`ເປີດ ຫຼັກຖານ ຮູບ ${i + 1} / ${urls.length} — ${refNo}`}
            className="group relative block size-28 overflow-hidden rounded-sm border border-border bg-muted transition-colors duration-fast hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`ຫຼັກຖານ ${i + 1}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-fast group-hover:scale-105"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
            >
              <ZoomIn className="size-3.5 text-white" />
            </span>
          </button>
        ))}
      </div>

      {openAt !== null && (
        <Lightbox urls={urls} index={openAt} refNo={refNo} onIndex={setOpenAt} onClose={() => setOpenAt(null)} />
      )}
    </div>
  );
}

function Lightbox({
  urls,
  index,
  refNo,
  onIndex,
  onClose,
}: {
  urls: string[];
  index: number;
  refNo: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (delta: number) => {
      setZoom(1); // a new photo always opens fit-to-screen
      onIndex((index + delta + urls.length) % urls.length);
    },
    [index, urls.length, onIndex]
  );

  // Keyboard is the point: an officer reviewing a queue should never have to
  // reach for the mouse. Esc closes, arrows page, +/- zoom.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(6, z * 1.4));
      else if (e.key === "-") setZoom((z) => Math.max(1, z / 1.4));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock the page behind the overlay, and restore focus sanely on open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const many = urls.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`ຫຼັກຖານ ຮູບ — ${refNo}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      // Click the backdrop to dismiss, but not a click on the image itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/15 px-4 py-2.5">
        <span className="font-mono text-xs tabular-nums text-white/70">{refNo}</span>
        {many && (
          <span className="font-mono text-xs tabular-nums text-white/70">
            {index + 1} / {urls.length}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <ToolButton
            label="ຫຍໍ້"
            en="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z / 1.4))}
          >
            <ZoomOut className="size-4" />
          </ToolButton>
          <span className="w-12 text-center font-mono text-2xs tabular-nums text-white/60">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton
            label="ຂະຫຍາຍ"
            en="Zoom in"
            disabled={zoom >= 6}
            onClick={() => setZoom((z) => Math.min(6, z * 1.4))}
          >
            <ZoomIn className="size-4" />
          </ToolButton>

          <a
            href={urls[index]}
            target="_blank"
            rel="noopener noreferrer"
            title="ເປີດ ໃນ ແທັບ ໃໝ່ / Open in new tab"
            className="ml-1 grid size-9 place-items-center rounded-sm text-white/80 transition-colors duration-fast hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ExternalLink className="size-4" />
          </a>
          <ToolButton ref={closeRef} label="ປິດ" en="Close (Esc)" onClick={onClose}>
            <X className="size-4" />
          </ToolButton>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {many && (
          <NavButton side="left" label="ຮູບ ກ່ອນ ໜ້າ" onClick={() => go(-1)}>
            <ChevronLeft className="size-6" />
          </NavButton>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[index]}
          alt={`ຫຼັກຖານ ${index + 1} / ${urls.length} — ${refNo}`}
          style={{ transform: `scale(${zoom})` }}
          className={cn(
            "max-h-full max-w-full origin-center object-contain transition-transform duration-fast",
            zoom > 1 && "cursor-move"
          )}
        />

        {many && (
          <NavButton side="right" label="ຮູບ ຕໍ່ ໄປ" onClick={() => go(1)}>
            <ChevronRight className="size-6" />
          </NavButton>
        )}
      </div>

      {/* Filmstrip — only earns its space with more than one photo. */}
      {many && (
        <div className="flex shrink-0 justify-center gap-2 border-t border-white/15 px-4 py-2.5">
          {urls.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setZoom(1);
                onIndex(i);
              }}
              aria-label={`ຮູບ ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "size-12 overflow-hidden rounded-sm border-2 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// forwardRef, not a `ref` prop: this console is on React 18, where `ref` is
// not an ordinary prop.
const ToolButton = forwardRef<
  HTMLButtonElement,
  { label: string; en: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }
>(function ToolButton({ label, en, children, onClick, disabled }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${label} / ${en}`}
      aria-label={`${label} — ${en}`}
      className="grid size-9 place-items-center rounded-sm text-white/80 transition-colors duration-fast hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
});

function NavButton({
  side,
  label,
  children,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-sm bg-black/50 text-white/80 transition-colors duration-fast hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        side === "left" ? "left-3" : "right-3"
      )}
    >
      {children}
    </button>
  );
}
