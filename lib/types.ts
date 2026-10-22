export type Role = "rep" | "support" | "manager";
export type ProductCategory = "fan" | "microwave" | "blender";
export type TicketStatus =
  | "SUBMITTED"
  | "REJECTED"
  | "APPROVED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "RECEIVED_AT_PLANT"
  | "REPAIRED"
  | "REPLACED"
  | "RETURN_SCHEDULED"
  | "DELIVERED";

export type Store = {
  id: string;
  name: string;
  retailer: string;
  city: string;
  address: string | null;
  manager_contact: string | null;
};

export type ProductModel = {
  id: string;
  category: ProductCategory;
  model_code: string;
  name: string;
  active: boolean;
};

export type Dispatcher = {
  id: string;
  name: string;
  phone: string | null;
  vehicle: string | null;
  active: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  store_id: string | null;
  store: Pick<Store, "name" | "retailer" | "city"> | null;
};

export type Ticket = {
  id: string;
  ticket_no: string;
  store_id: string;
  product_model_id: string;
  serial_no: string;
  issue_description: string;
  store_manager_name: string;
  status: TicketStatus;
  rejection_reason: string | null;
  resolution: "repair" | "replace" | null;
  replacement_serial_no: string | null;
  pickup_dispatcher_id: string | null;
  return_dispatcher_id: string | null;
  verify_token: string;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  /** null = not decided yet (before approval). */
  under_warranty: boolean | null;
  /** Rupees to charge the customer when out of warranty. */
  charge_amount: number | null;
  payment_received_at: string | null;
  payment_received_by: string | null;
};

/** Ticket with related rows, as loaded by getTicket(). */
export type TicketFull = Ticket & {
  store: Store;
  product: ProductModel;
  pickup: Dispatcher | null;
  ret: Dispatcher | null;
  creator: { full_name: string } | null;
  approver: { full_name: string } | null;
  payer: { full_name: string } | null;
};

export type TicketEvent = {
  id: number;
  ticket_id: string;
  from_status: TicketStatus | null;
  to_status: TicketStatus;
  /** status = workflow step; warranty/payment = charge changes (status unchanged). */
  kind: "status" | "warranty" | "payment";
  note: string | null;
  created_at: string;
  actor: { full_name: string; role: Role } | null;
};
