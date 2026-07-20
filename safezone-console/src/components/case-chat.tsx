"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Card, CardContent, PanelTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Annotation } from "@/components/bilingual";
import { createClient } from "@/lib/supabase/client";
import { agoLao, cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  direction: "FROM_CITIZEN" | "FROM_STAFF";
  body: string;
  authorName: string | null;
  createdAt: string | Date;
};

/**
 * The two-way thread with the person in the case.
 *
 * Live via the same pattern as `realtime-inbox.tsx`: the Realtime event is a
 * bare trigger carrying no payload, and the actual messages are refetched from
 * `/api/cases/[id]/messages`, which re-checks staff scope. That keeps the
 * authoritative read on the server even though the subscription is in the
 * browser — the websocket never has to be trusted with content.
 *
 * Polling is kept as a backstop: if Realtime is unreachable (blocked network,
 * publication not added yet) the thread still updates, just more slowly. A
 * chat that silently stops delivering is worse than a slow one.
 */
export function CaseChat({
  caseId,
  initial,
  resolved,
}: {
  caseId: string;
  initial: ChatMessage[];
  resolved: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}/messages`, { cache: "no-store" });
    if (res.ok) setMessages((await res.json()).messages);
  }, [caseId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`case-chat:${caseId}`)
      .on(
        "postgres_changes",
        // Filtered to this case: an officer with one case open should not wake
        // on every other conversation in the country.
        { event: "*", schema: "public", table: "case_messages", filter: `case_id=eq.${caseId}` },
        () => refresh()
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Backstop. Cheap (one small query) and only while the thread is open.
    const poll = setInterval(refresh, 20_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [caseId, refresh]);

  // Keep the newest message in view — a thread that opens scrolled to the top
  // makes an officer hunt for what just arrived.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setError(res.status === 409 ? "ເຄສ ນີ້ ປິດ ແລ້ວ" : "ສົ່ງ ບໍ່ ສຳເລັດ");
        return;
      }
      setDraft("");
      await refresh();
    } catch {
      setError("ສົ່ງ ບໍ່ ສຳເລັດ");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <PanelTitle lo="ຂໍ້ຄວາມ ກັບ ຜູ້ ປະສົບ ເຫດ" en="Chat with the citizen" />
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", live ? "bg-success" : "bg-muted-foreground")}
          />
          <Annotation>{live ? "Live" : "Realtime disconnected — polling"}</Annotation>
        </div>

        <div
          ref={scroller}
          className="max-h-80 space-y-2 overflow-y-auto rounded-sm border border-border bg-muted/30 p-3"
        >
          {messages.length === 0 ? (
            <p lang="lo" className="py-6 text-center font-lao text-sm leading-lao text-muted-foreground">
              ຍັງ ບໍ່ ມີ ຂໍ້ຄວາມ
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.direction === "FROM_STAFF";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-sm px-3 py-2",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    )}
                  >
                    <p lang="lo" className="whitespace-pre-wrap font-lao text-sm leading-lao">
                      {m.body}
                    </p>
                    <div
                      className={cn(
                        "mt-1 font-mono text-2xs tabular-nums",
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {mine ? m.authorName ?? "Staff" : "ຜູ້ໃຊ້"} · {agoLao(new Date(m.createdAt))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {resolved ? (
          <p lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">
            ເຄສ ນີ້ ແກ້ໄຂ ແລ້ວ — ປິດ ການ ສົນທະນາ
          </p>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter breaks the line — the convention
                // anyone typing under time pressure already has in their hands.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="ຂຽນ ຂໍ້ຄວາມ ຫາ ຜູ້ ປະສົບ ເຫດ..."
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={send} disabled={sending || !draft.trim()}>
                <Send aria-hidden className="mr-1.5 size-3.5" />
                <span lang="lo" className="font-lao">
                  {sending ? "ກຳລັງ ສົ່ງ..." : "ສົ່ງ"}
                </span>
              </Button>
              {error && (
                <span lang="lo" className="font-lao text-xs leading-lao text-critical-ink">
                  {error}
                </span>
              )}
            </div>
            {/* The limitation must be visible to the officer, not implied away:
                the app has no push notifications. */}
            <p className="flex items-start gap-1.5 text-2xs text-muted-foreground">
              <MessageSquare aria-hidden className="mt-0.5 size-3 shrink-0" />
              <span lang="lo" className="font-lao leading-lao">
                ຜູ້ໃຊ້ ຈະ ເຫັນ ຂໍ້ຄວາມ ເມື່ອ ເປີດ ແອັບ — ຖ້າ ດ່ວນ ໃຫ້ ໂທ
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
