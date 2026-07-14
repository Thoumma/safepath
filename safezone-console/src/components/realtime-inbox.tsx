"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { CaseRow } from "@/components/case-row";
import { Annotation } from "@/components/bilingual";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CaseListItem } from "@/lib/types";

export function RealtimeInbox({ initial }: { initial: CaseListItem[] }) {
  const [cases, setCases] = useState<CaseListItem[]>(initial);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cases", { cache: "no-store" });
      if (res.ok) setCases(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cases-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => refresh())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        {/* Connection state is information, so it gets a color: emerald when
            live, neutral when not. It is not decoration and does not blink. */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-2", live ? "bg-success" : "bg-low")}
          />
          <Annotation className={live ? "text-success-ink" : undefined}>
            {live ? "Live" : "Realtime disconnected"}
          </Annotation>
        </div>

        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          <RefreshCw aria-hidden className={cn("size-3.5", loading && "animate-spin")} />
          <span lang="lo" className="font-lao">
            ໂຫລດ ໃໝ່
          </span>
        </button>
      </div>

      {/* aria-live so an arriving case is announced, not merely rendered. */}
      <div aria-live="polite">
        {cases.length === 0 ? (
          <p
            lang="lo"
            className="border border-border bg-card px-4 py-8 text-center font-lao text-sm leading-lao text-muted-foreground"
          >
            ບໍ່ມີ ເຄສ ໃນ ຂອບເຂດ ຂອງ ທ່ານ
          </p>
        ) : (
          <ul className="space-y-px">
            {cases.map((c) => (
              <li key={c.id}>
                <CaseRow c={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
