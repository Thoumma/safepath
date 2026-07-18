import { PageHeader } from "@/components/page-header";
import { RealtimeInbox } from "@/components/realtime-inbox";
import { requireStaff } from "@/lib/auth";
import { listCases } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const staff = await requireStaff();
  const cases = await listCases(staff);

  return (
    <>
      <PageHeader lo="ສາຍ SOS ເຂົ້າ" en="SOS Inbox" sub="ຮຽງ ຕາມ ໃໝ່ສຸດ — ອັບເດດ ອັດຕະໂນມັດ" />
      <div className="p-6">
        <RealtimeInbox initial={cases} />
      </div>
    </>
  );
}
