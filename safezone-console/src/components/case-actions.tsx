"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER } from "@/lib/constants";

type Props = {
  caseId: string;
  status: string;
  phone: string | null;
  routedTo: string | null;
  responders: { id: string; name: string }[];
};

const selectClass =
  "h-9 rounded-sm border border-border bg-card px-2 font-lao text-sm transition-colors duration-fast hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40";

export function CaseActions({ caseId, status, phone, routedTo, responders }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) start(() => router.refresh());
  }

  async function addEvent(kind: string, message: string) {
    if (!message.trim()) return;
    const res = await fetch(`/api/cases/${caseId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, message }),
    });
    if (res.ok) {
      setNote("");
      start(() => router.refresh());
    }
  }

  const resolved = status === "RESOLVED";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex">
            <Button variant="outline" size="sm" type="button">
              <Phone />
              <span lang="lo" className="font-lao">
                ໂທ ຫາ ຜູ້ປະສົບໄພ
              </span>
            </Button>
          </a>
        )}

        <select
          defaultValue={routedTo ?? ""}
          onChange={(e) => patch({ routedTo: e.target.value })}
          className={selectClass}
          aria-label="ສົ່ງຕໍ່ ຫາ ພັນທະມິດ"
          disabled={resolved || pending}
        >
          <option value="" disabled>
            ສົ່ງຕໍ່ ຫາ...
          </option>
          {Object.entries(PARTNER).map(([code, p]) => (
            <option key={code} value={code}>
              {p.lo} · {p.en}
            </option>
          ))}
        </select>

        <select
          defaultValue=""
          onChange={(e) => {
            const r = responders.find((x) => x.id === e.target.value);
            patch({ responderId: e.target.value, status: "IN_PROGRESS" });
            // Timeline entries are the audit record of an emergency response.
            // They are read back by staff and partners; they do not need emoji.
            if (r) addEvent("assign", `ມອບໝາຍ ${r.name}`);
          }}
          className={selectClass}
          aria-label="ມອບໝາຍ Responder"
          disabled={resolved || pending || responders.length === 0}
        >
          <option value="" disabled>
            ມອບໝາຍ Responder...
          </option>
          {responders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {!resolved && (
          <Button
            variant="success"
            size="sm"
            type="button"
            disabled={pending}
            onClick={() => {
              patch({ status: "RESOLVED" });
              addEvent("resolve", "ໝາຍ ວ່າ ແກ້ໄຂ ແລ້ວ");
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            <span lang="lo" className="font-lao">
              ແກ້ໄຂ ແລ້ວ
            </span>
          </Button>
        )}
      </div>

      {!resolved && (
        <div className="flex items-start gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="ເພີ່ມ ບັນທຶກ ໃສ່ ໄທມ໌ໄລນ໌"
            placeholder="ເພີ່ມ ບັນທຶກ ໃສ່ ໄທມ໌ໄລນ໌..."
            className="min-h-[40px] font-lao"
          />
          <Button type="button" size="sm" disabled={pending || !note.trim()} onClick={() => addEvent("note", note)}>
            <Send />
            <span lang="lo" className="font-lao">
              ເພີ່ມ
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
