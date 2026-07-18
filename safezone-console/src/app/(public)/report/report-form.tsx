"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_CATEGORIES } from "@/lib/trafficking-signs";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "done" | "error";

/**
 * The public report form. Posts to the unauthenticated `POST /api/report`.
 *
 * Everything except category + description is optional — the goal is the lowest
 * possible barrier to reporting a suspicion. Anonymity is the default: the
 * contact field is opt-in and clearly labelled. The `website` field is a
 * honeypot (hidden from humans); bots that fill it get a fake success.
 */
export function ReportForm() {
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [refNo, setRefNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    if (!category) {
      setError("ກະລຸນາເລືອກປະເພດ");
      return;
    }
    const description = (data.get("description") as string)?.trim();
    if (!description) {
      setError("ກະລຸນາຂຽນລາຍລະອຽດ");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          country: data.get("country") || undefined,
          city: data.get("city") || undefined,
          locationText: data.get("locationText") || undefined,
          observedAt: data.get("observedAt") || undefined,
          reporterContact: data.get("reporterContact") || undefined,
          website: data.get("website") || undefined, // honeypot
          source: "PUBLIC_WEB",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { refNo: string };
      setRefNo(body.refNo);
      setStatus("done");
      form.reset();
      setCategory("");
    } catch {
      setStatus("error");
      setError("ສົ່ງບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.");
    }
  }

  if (status === "done" && refNo) {
    return (
      <div className="rounded-sm border border-success bg-success/5 p-8 text-center">
        <ShieldCheck aria-hidden className="mx-auto size-12 text-success-ink" />
        <h2 lang="lo" className="mt-4 font-lao text-xl font-bold leading-lao">ຂອບໃຈ. ພວກເຮົາໄດ້ຮັບລາຍງານແລ້ວ.</h2>
        <p lang="lo" className="mt-2 font-lao text-sm leading-lao text-muted-foreground">
          ທີມງານຈະກວດເບິ່ງ. ຖ້າຢາກຕິດຕາມ ໃຫ້ຈົດເລກອ້າງອີງນີ້ໄວ້:
        </p>
        <p className="mt-3 font-mono text-lg font-bold tabular-nums text-foreground">{refNo}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setStatus("idle");
            setRefNo(null);
          }}
        >
          <span lang="lo" className="font-lao">ສົ່ງລາຍງານອື່ນ</span>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Category */}
      <fieldset>
        <legend lang="lo" className="font-lao text-sm font-semibold leading-lao">
          ປະເພດ <span className="text-critical-ink">*</span>
        </legend>
        <p lang="lo" className="mt-1 font-lao text-xs leading-lao text-muted-foreground">ບໍ່ແນ່ໃຈກໍເລືອກ “ອື່ນໆ” ໄດ້.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {REPORT_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.key}
              onClick={() => setCategory(c.key)}
              aria-pressed={category === c.key}
              className={cn(
                "flex flex-col items-start rounded-sm border p-3 text-left transition-colors duration-fast",
                category === c.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-border-strong"
              )}
            >
              <span lang="lo" className="font-lao text-sm font-semibold leading-lao">{c.lo}</span>
              <span lang="en" className="annotation">{c.en}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Description */}
      <div>
        <label htmlFor="description" lang="lo" className="font-lao text-sm font-semibold leading-lao">
          ເກີດຫຍັງຂຶ້ນ? <span className="text-critical-ink">*</span>
        </label>
        <p lang="lo" className="mt-1 font-lao text-xs leading-lao text-muted-foreground">
          ບອກສິ່ງທີ່ທ່ານເຫັນ ຫຼື ໄດ້ຍິນ ເທົ່າທີ່ຮູ້. ບໍ່ຕ້ອງແນ່ໃຈ 100%.
        </p>
        <Textarea id="description" name="description" rows={6} className="mt-3" maxLength={5000}
          placeholder="ຕົວຢ່າງ: ເຫັນຄົນງານຢູ່ຮ້ານແຫ່ງໜຶ່ງ ເບິ່ງຄືຖືກຄວບຄຸມ ແລະ ອອກໄປບໍ່ໄດ້..." />
      </div>

      {/* Location */}
      <div>
        <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">ຢູ່ໃສ? <span className="font-normal text-muted-foreground">(ຖ້າຮູ້)</span></h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input name="country" placeholder="ປະເທດ / Country" maxLength={200} />
          <Input name="city" placeholder="ເມືອງ / City" maxLength={200} />
        </div>
        <Input name="locationText" className="mt-3" maxLength={200}
          placeholder="ສະຖານທີ່ / ຈຸດສັງເກດ (ຕົວຢ່າງ: ໃກ້ຕະຫຼາດ...)" />
      </div>

      {/* When */}
      <div>
        <label htmlFor="observedAt" lang="lo" className="font-lao text-sm font-semibold leading-lao">
          ເຫັນເມື່ອໃດ? <span className="font-normal text-muted-foreground">(ຖ້າຮູ້)</span>
        </label>
        <Input id="observedAt" name="observedAt" type="date" className="mt-3 max-w-xs" />
      </div>

      {/* Contact (opt-in) */}
      <div className="rounded-sm border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <EyeOff aria-hidden className="size-4 text-muted-foreground" />
          <h3 lang="lo" className="font-lao text-sm font-semibold leading-lao">ບໍ່ຕ້ອງໃສ່ຊື່</h3>
        </div>
        <p lang="lo" className="mt-1.5 font-lao text-xs leading-lao text-muted-foreground">
          ໂດຍປົກກະຕິ ລາຍງານນີ້ບໍ່ເປີດເຜີຍຊື່. ຖ້າຢາກໃຫ້ພວກເຮົາຕິດຕໍ່ກັບ ໃສ່ອີເມວ ຫຼື ເບີໂທ (ບໍ່ບັງຄັບ).
        </p>
        <Input name="reporterContact" className="mt-3" maxLength={200}
          placeholder="ອີເມວ ຫຼື ເບີໂທ (ບໍ່ບັງຄັບ)" />
      </div>

      {/* Honeypot — hidden from humans, catches bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden" >
        <label>Leave this field empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-critical bg-critical/5 px-3 py-2.5 text-critical-ink">
          <AlertCircle aria-hidden className="size-4 shrink-0" />
          <span lang="lo" className="font-lao text-sm leading-lao">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" variant="destructive" size="lg" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              <span lang="lo" className="font-lao">ກຳລັງສົ່ງ...</span>
            </>
          ) : (
            <>
              <ShieldCheck aria-hidden className="size-4" />
              <span lang="lo" className="font-lao">ສົ່ງລາຍງານ</span>
            </>
          )}
        </Button>
        <p lang="lo" className="font-lao text-xs leading-lao text-muted-foreground">ເປັນຄວາມລັບ ແລະ ປອດໄພ</p>
      </div>
    </form>
  );
}
