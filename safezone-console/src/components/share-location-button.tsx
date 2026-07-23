"use client";

import { useState } from "react";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Hands a duty officer a location they can forward to whoever is closest to the
 * scene — local police, a partner NGO, a family member driving over. The
 * console shows the position on an OSM embed, but a rescuer needs a *link they
 * can send*, not a map on someone else's screen.
 *
 * The link is a Google Maps query — the one map app almost anyone receiving it
 * already has and can navigate from with one tap. "Share" opens the OS share
 * sheet where it exists (so the officer can drop it straight into WhatsApp,
 * SMS, Line…); everywhere else it falls back to copying, the same thing the
 * explicit copy button does.
 */
export function ShareLocationButton({
  lat,
  lng,
  name,
  refNo,
}: {
  lat: number;
  lng: number;
  name?: string | null;
  refNo?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const text = ["SafeZone SOS", refNo, name].filter(Boolean).join(" · ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — the "Open" link
      // below is always available as the manual fallback.
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // User dismissed the sheet, or the platform refused — fall back to copy
        // rather than leave the officer with nothing.
      }
    }
    await copy();
  }

  return (
    <div className="flex flex-wrap gap-2 pt-3">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 aria-hidden className="mr-1.5 size-3.5" />
        <span lang="lo" className="font-lao">
          ແບ່ງປັນ ຕຳແໜ່ງ
        </span>
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? (
          <Check aria-hidden className="mr-1.5 size-3.5 text-success-ink" />
        ) : (
          <Copy aria-hidden className="mr-1.5 size-3.5" />
        )}
        <span lang="lo" className="font-lao">
          {copied ? "ສຳເນົາ ລິ້ງ ແລ້ວ" : "ສຳເນົາ ລິ້ງ"}
        </span>
      </Button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ExternalLink aria-hidden className="mr-1.5 size-3.5" />
        <span lang="lo" className="font-lao">
          ເປີດ ໃນ ແຜນທີ່
        </span>
      </a>
    </div>
  );
}
