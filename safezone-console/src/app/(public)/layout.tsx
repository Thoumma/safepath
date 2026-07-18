import type { Metadata } from "next";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "SafeZone — ຕ້ານການຄ້າມະນຸດ / Stop trafficking",
  description:
    "Report suspected human trafficking, anonymously and securely. Protecting Lao travellers abroad.",
};

/**
 * The public website shell — Home / About / Contact / Report. Deliberately
 * separate from the `/admin` staff console: no sidebar, no auth. It inherits the
 * root layout's fonts + theme script, and adds the public header and footer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
