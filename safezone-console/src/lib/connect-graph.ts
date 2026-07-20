/**
 * Builds the People Connect graph: who is connected to whom through the
 * trusted-contact lists the app syncs up.
 *
 * The raw edge is Citizen → (name, phone): a trusted contact is free text, not
 * a foreign key. The only linking key the console has is the E.164 phone
 * number, so:
 *
 *  - a contact whose phone matches a *registered citizen* becomes an edge to
 *    that citizen's node — the bridge that turns a list into a network;
 *  - all other contacts sharing one phone number collapse into a single
 *    "external contact" leaf node, which is exactly what makes clusters
 *    visible: two travellers who both trust the same aunt meet at her node.
 *
 * Pure and framework-free so it can be unit-tested and reused server-side.
 */

export type ConnectNode = {
  id: string;
  kind: "citizen" | "contact";
  label: string;
  phone: string | null;
  /** Edge count — drives node radius in the renderer. */
  degree: number;
};

export type ConnectEdge = {
  source: string;
  target: string;
  relation: string | null;
  isPrimary: boolean;
  /** True when both endpoints are registered citizens. */
  bridge: boolean;
};

export type ConnectGraph = {
  nodes: ConnectNode[];
  edges: ConnectEdge[];
  citizenCount: number;
  contactCount: number;
  bridgeCount: number;
};

type CitizenRow = { id: string; fullName: string; phone: string | null };
type ContactRow = {
  citizenId: string;
  name: string;
  phone: string;
  relation: string | null;
  isPrimary: boolean;
};

const citizenNodeId = (id: string) => `c:${id}`;
const contactNodeId = (phone: string) => `p:${phone}`;

export function buildConnectGraph(citizens: CitizenRow[], contacts: ContactRow[]): ConnectGraph {
  const nodes = new Map<string, ConnectNode>();
  const edges: ConnectEdge[] = [];
  // Dedup: the same (citizen, phone) pair must not draw two parallel edges.
  const seenEdges = new Set<string>();

  const citizenByPhone = new Map<string, CitizenRow>();
  for (const c of citizens) {
    if (c.phone) citizenByPhone.set(c.phone, c);
    nodes.set(citizenNodeId(c.id), {
      id: citizenNodeId(c.id),
      kind: "citizen",
      label: c.fullName,
      phone: c.phone,
      degree: 0,
    });
  }

  const bump = (id: string) => {
    const n = nodes.get(id);
    if (n) n.degree += 1;
  };

  for (const tc of contacts) {
    const sourceId = citizenNodeId(tc.citizenId);
    if (!nodes.has(sourceId)) continue; // orphan row; citizen was deleted

    const asCitizen = citizenByPhone.get(tc.phone);
    // Self-loop (someone listing their own number) says nothing about the
    // network; skip it.
    if (asCitizen && citizenNodeId(asCitizen.id) === sourceId) continue;

    const targetId = asCitizen ? citizenNodeId(asCitizen.id) : contactNodeId(tc.phone);
    const key = `${sourceId}→${targetId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);

    if (!asCitizen && !nodes.has(targetId)) {
      nodes.set(targetId, {
        id: targetId,
        kind: "contact",
        // First-seen name wins; different citizens may label the same person
        // differently ("mum" / "Mrs Chan") and one label must be picked.
        label: tc.name,
        phone: tc.phone,
        degree: 0,
      });
    }

    edges.push({
      source: sourceId,
      target: targetId,
      relation: tc.relation,
      isPrimary: tc.isPrimary,
      bridge: !!asCitizen,
    });
    bump(sourceId);
    bump(targetId);
  }

  const nodeList = [...nodes.values()];
  return {
    nodes: nodeList,
    edges,
    citizenCount: citizens.length,
    contactCount: nodeList.filter((n) => n.kind === "contact").length,
    bridgeCount: edges.filter((e) => e.bridge).length,
  };
}
