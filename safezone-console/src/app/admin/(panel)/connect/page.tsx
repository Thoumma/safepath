import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatBlock } from "@/components/stat-card";
import { PeopleConnect } from "@/components/people-connect";
import { Card, CardContent, PanelTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConnectGraph } from "@/lib/connect-graph";

export const dynamic = "force-dynamic";

/**
 * /admin/connect — People Connect: the network the trusted-contact lists form.
 *
 * Every registered citizen is a node; every trusted contact either bridges to
 * another registered citizen (matched by E.164 phone) or becomes a shared
 * external-contact node. Clusters answer questions a table cannot: who
 * travels in a group, which family hub connects five travellers, and — when a
 * case opens — who else might know where someone is.
 *
 * Embassy-only. This is the social graph of vulnerable people; PARTNER staff
 * get neither the nav item (staffOnly) nor the page itself.
 */
export default async function ConnectPage() {
  const staff = await requireStaff();
  if (staff.role === "PARTNER") redirect("/admin");

  const [citizens, contacts] = await Promise.all([
    prisma.citizen.findMany({ select: { id: true, fullName: true, phone: true } }),
    prisma.trustedContact.findMany({
      select: { citizenId: true, name: true, phone: true, relation: true, isPrimary: true },
    }),
  ]);

  const graph = buildConnectGraph(citizens, contacts);

  return (
    <>
      <PageHeader
        lo="ເຄືອຂ່າຍ ຄົນ"
        en="People Connect"
        sub="ສາຍພົວພັນ ລະຫວ່າງ ພົນລະເມືອງ ແລະ ຜູ້ຕິດຕໍ່ ທີ່ ໄວ້ໃຈ"
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <StatBlock lo="ພົນລະເມືອງ" en="Citizens" value={graph.citizenCount} />
          <StatBlock lo="ຜູ້ຕິດຕໍ່ ພາຍນອກ" en="External contacts" value={graph.contactCount} />
          <StatBlock lo="ສາຍພົວພັນ ພົນລະເມືອງ" en="Citizen bridges" value={graph.bridgeCount} tone="success" />
        </div>

        <Card>
          <PanelTitle lo="ແຜນຜັງ ເຄືອຂ່າຍ" en="Network graph" />
          <CardContent>
            {graph.edges.length === 0 ? (
              <p
                lang="lo"
                className="grid h-[36rem] place-items-center rounded-sm border border-border bg-muted font-lao text-sm leading-lao text-muted-foreground"
              >
                ຍັງບໍ່ມີ ຂໍ້ມູນ ຜູ້ຕິດຕໍ່ ຈາກ ແອັບ
              </p>
            ) : (
              <PeopleConnect nodes={graph.nodes} edges={graph.edges} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
