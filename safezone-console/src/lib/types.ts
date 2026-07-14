import type { SeverityKey, StatusKey, PartnerKey } from "@/lib/constants";

/** Plain, serializable case shape passed to client components. */
export type CaseListItem = {
  id: string;
  refNo: string;
  citizenName: string;
  severity: SeverityKey;
  status: StatusKey;
  type: string;
  city: string | null;
  country: string | null;
  routedTo: PartnerKey | null;
  createdAt: string; // ISO
};
