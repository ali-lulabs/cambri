import { createClient } from "@/lib/supabase/server";
import type { Dispatcher, TicketEvent, TicketFull } from "@/lib/types";

const TICKET_SELECT = `*,
  store:stores(*, area_rep:profiles!stores_area_rep_id_fkey(full_name)),
  product:product_models(*),
  pickup:dispatchers!tickets_pickup_dispatcher_id_fkey(*),
  ret:dispatchers!tickets_return_dispatcher_id_fkey(*),
  creator:profiles!tickets_created_by_fkey(full_name),
  approver:profiles!tickets_approved_by_fkey(full_name),
  payer:profiles!tickets_payment_received_by_fkey(full_name)`;

/** Loads a ticket and its timeline. Returns null if missing or not visible to this user. */
export async function getTicket(id: string): Promise<{ ticket: TicketFull; events: TicketEvent[] } | null> {
  const supabase = await createClient();
  const { data: ticket } = await supabase.from("tickets").select(TICKET_SELECT).eq("id", id).maybeSingle();
  if (!ticket) return null;
  const { data: events } = await supabase
    .from("ticket_events")
    .select("id, ticket_id, from_status, to_status, kind, note, created_at, actor:profiles(full_name, role)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  return { ticket: ticket as unknown as TicketFull, events: (events ?? []) as unknown as TicketEvent[] };
}

export async function getActiveDispatchers(): Promise<Dispatcher[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("dispatchers").select("*").eq("active", true).order("name");
  return (data ?? []) as Dispatcher[];
}

/** List columns for queue/list views. */
export const TICKET_LIST_SELECT = `id, ticket_no, status, serial_no, created_at, updated_at, store_manager_name,
  under_warranty, charge_amount, payment_received_at,
  store:stores(name), product:product_models(name, model_code, category)`;

export type TicketListRow = {
  id: string;
  ticket_no: string;
  status: TicketFull["status"];
  serial_no: string;
  created_at: string;
  updated_at: string;
  store_manager_name: string;
  under_warranty: boolean | null;
  charge_amount: number | null;
  payment_received_at: string | null;
  store: { name: string } | null;
  product: { name: string; model_code: string; category: string } | null;
};
