import type { TicketStatus } from "@/lib/types";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  SUBMITTED: "Awaiting review",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  RECEIVED_AT_PLANT: "At plant",
  REPAIRED: "Repaired",
  REPLACED: "Replaced",
  RETURN_SCHEDULED: "Out for return",
  DELIVERED: "Delivered",
};

/** Past-tense phrasing for timeline entries. */
export const EVENT_LABEL: Record<TicketStatus, string> = {
  SUBMITTED: "Complaint logged",
  REJECTED: "Request rejected",
  APPROVED: "Request approved",
  PICKUP_SCHEDULED: "Pickup dispatcher assigned",
  PICKED_UP: "Unit collected from store",
  RECEIVED_AT_PLANT: "Unit received at plant",
  REPAIRED: "Unit repaired",
  REPLACED: "Unit replaced",
  RETURN_SCHEDULED: "Return dispatcher assigned",
  DELIVERED: "Delivered back to store",
};

export type Tone = "amber" | "blue" | "violet" | "teal" | "green" | "red";

export const STATUS_TONE: Record<TicketStatus, Tone> = {
  SUBMITTED: "amber",
  APPROVED: "blue",
  PICKUP_SCHEDULED: "blue",
  PICKED_UP: "violet",
  RECEIVED_AT_PLANT: "violet",
  REPAIRED: "teal",
  REPLACED: "teal",
  RETURN_SCHEDULED: "teal",
  DELIVERED: "green",
  REJECTED: "red",
};

/** The five stages shown in the progress bar. */
export const STAGES = [
  { key: "review", label: "Review", statuses: ["SUBMITTED"] },
  { key: "pickup", label: "Pickup", statuses: ["APPROVED", "PICKUP_SCHEDULED"] },
  { key: "plant", label: "At plant", statuses: ["PICKED_UP", "RECEIVED_AT_PLANT"] },
  { key: "return", label: "Return", statuses: ["REPAIRED", "REPLACED", "RETURN_SCHEDULED"] },
  { key: "done", label: "Delivered", statuses: ["DELIVERED"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly TicketStatus[] }[];

export function stageIndex(status: TicketStatus): number {
  if (status === "REJECTED") return 0;
  return STAGES.findIndex((s) => (s.statuses as readonly TicketStatus[]).includes(status));
}

export const CLOSED_STATUSES: TicketStatus[] = ["DELIVERED", "REJECTED"];
export const isClosed = (s: TicketStatus) => CLOSED_STATUSES.includes(s);

/** Support queue tabs. */
export const QUEUE_TABS = [
  { key: "review", label: "Needs review", statuses: ["SUBMITTED"] },
  { key: "pickup", label: "Pickup", statuses: ["APPROVED", "PICKUP_SCHEDULED"] },
  { key: "plant", label: "At plant", statuses: ["PICKED_UP", "RECEIVED_AT_PLANT", "REPAIRED", "REPLACED"] },
  { key: "return", label: "Out for return", statuses: ["RETURN_SCHEDULED"] },
  { key: "closed", label: "Closed", statuses: ["DELIVERED", "REJECTED"] },
  // Special: out-of-warranty jobs whose payment hasn't been received (any status).
  { key: "unpaid", label: "Payment due", statuses: [] },
  { key: "all", label: "All", statuses: [] },
] as const satisfies readonly { key: string; label: string; statuses: readonly TicketStatus[] }[];

export const CATEGORY_LABEL = { fan: "Fan", microwave: "Microwave", blender: "Blender" } as const;
