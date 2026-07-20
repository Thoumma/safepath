import type { Metadata } from "next";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { getDonationConfig, donationReady } from "@/lib/settings";

export const metadata: Metadata = {
  title: "SafeZone — ຕ້ານການຄ້າມະນຸດ / Stop trafficking",
  description:
    "Report suspected human trafficking, anonymously and securely. Protecting Lao travellers abroad.",
};

// The public site is cacheable, and must be: its visitors are on Lao mobile
// networks, and this layout used to be `force-dynamic` purely to read ONE
// donation setting — which forced Home/About/Contact/Report to render on a
// server per request and told the CDN not to store anything. Measured cost:
// ~1.5s TTFB warm, 4.1s cold.
//
// With ISR the pages are served from the edge instead. Staff toggling
// donations does NOT wait for this window: `saveDonationSettings` calls
// `revalidatePath("/", "layout")`, so the nav/footer update on the next
// request. The 10 minutes is only the backstop for changes made straight in
// the database.
//
// The DB read below stays wrapped in try/catch, so a build (or a
// revalidation) with an unreachable database degrades to "no Donate link"
// rather than failing the page.
export const revalidate = 600;

/**
 * The public website shell — Home / About / Contact / Report / Donate.
 * Deliberately separate from the `/admin` staff console: no sidebar, no auth. It
 * inherits the root layout's fonts + theme script, and adds the public header
 * and footer. The Donate link is shown only when donations are enabled (item
 * #14b, fail-open: a DB hiccup hides it rather than linking to a 404).
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let showDonate = false;
  try {
    showDonate = donationReady(await getDonationConfig());
  } catch {
    showDonate = false;
  }

  return (
    // `public-surface` rescopes the design tokens to the Trust-Teal (Blue Heart)
    // public palette — see globals.css. The staff `/admin` console keeps the
    // Swiss navy system untouched.
    <div className="public-surface  flex min-h-screen flex-col bg-background">
      <PublicNav showDonate={showDonate} />
      <main className="flex-1">{children}</main>
      <PublicFooter showDonate={showDonate} />
    </div>
  );
}
