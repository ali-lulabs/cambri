"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyStores, getProfile } from "@/lib/auth";
import type { TicketStatus } from "@/lib/types";
import type { FormState } from "./auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/**
 * Log a new complaint. Store reps log for their own store; area reps for any store
 * they cover (e.g. when a retail store manager calls them); managers for any store.
 */
export async function createTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  let storeId: string | null = null;
  if (profile.role === "rep") {
    storeId = profile.store_id;
  } else if (profile.role === "area_rep" || profile.role === "manager") {
    const chosen = text(formData, "store_id");
    const mine = await getMyStores();
    if (!mine.some((s) => s.id === chosen)) return { error: "Choose one of your stores." };
    storeId = chosen;
  }
  if (!storeId) return { error: "You can't log complaints with this account." };

  const product_model_id = text(formData, "product_model_id");
  const serial_no = text(formData, "serial_no").toUpperCase();
  const issue_description = text(formData, "issue_description");
  const store_manager_name = text(formData, "store_manager_name");
  if (!product_model_id || !serial_no || !issue_description || !store_manager_name) {
    return { error: "Please fill in every field." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      store_id: storeId,
      product_model_id,
      serial_no,
      issue_description,
      store_manager_name,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save the complaint." };

  if (profile.role === "rep") {
    revalidatePath("/rep");
    redirect(`/rep/tickets/${data.id}?created=1`);
  }
  revalidatePath("/support");
  redirect(`/support/tickets/${data.id}?created=1`);
}

/** Support moves a ticket to its next step. Rules live in the transition_ticket() DB function. */
export async function transitionTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const ticketId = text(formData, "ticket_id");
  const to = text(formData, "to") as TicketStatus;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_ticket", {
    p_ticket_id: ticketId,
    p_to: to,
    p_note: text(formData, "note") || null,
    p_dispatcher_id: text(formData, "dispatcher_id") || null,
    p_replacement_serial: text(formData, "replacement_serial").toUpperCase() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/support/tickets/${ticketId}`);
  revalidatePath("/support");
  return { ok: true };
}

function parseCharge(formData: FormData): { under_warranty: boolean | null; amount: number | null; error?: string } {
  const w = text(formData, "warranty");
  if (w !== "yes" && w !== "no") return { under_warranty: null, amount: null, error: "Choose whether the unit is under warranty." };
  if (w === "yes") return { under_warranty: true, amount: null };
  const amount = Number(text(formData, "charge_amount").replace(/[,\s]/g, "").replace(/^rs\.?/i, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { under_warranty: false, amount: null, error: "Enter the amount to charge the customer." };
  return { under_warranty: false, amount: Math.round(amount * 100) / 100 };
}

function revalidateTicket(ticketId: string) {
  revalidatePath(`/support/tickets/${ticketId}`);
  revalidatePath("/support");
  revalidatePath("/manager");
}

/** Approve with a warranty decision (and charge if out of warranty). */
export async function approveTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const ticketId = text(formData, "ticket_id");
  const charge = parseCharge(formData);
  if (charge.error) return { error: charge.error };

  const supabase = await createClient();
  const { error: chargeErr } = await supabase.rpc("set_ticket_charge", {
    p_ticket_id: ticketId,
    p_under_warranty: charge.under_warranty,
    p_charge_amount: charge.amount,
  });
  if (chargeErr) return { error: chargeErr.message };

  const { error } = await supabase.rpc("transition_ticket", {
    p_ticket_id: ticketId,
    p_to: "APPROVED",
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: error.message };

  revalidateTicket(ticketId);
  return { ok: true };
}

/** Change warranty / charge on an open ticket. */
export async function saveCharge(_prev: FormState, formData: FormData): Promise<FormState> {
  const ticketId = text(formData, "ticket_id");
  const charge = parseCharge(formData);
  if (charge.error) return { error: charge.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ticket_charge", {
    p_ticket_id: ticketId,
    p_under_warranty: charge.under_warranty,
    p_charge_amount: charge.amount,
  });
  if (error) return { error: error.message };
  revalidateTicket(ticketId);
  return { ok: true, message: "Saved." };
}

/** Mark the customer's payment as received, or undo. */
export async function setPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const ticketId = text(formData, "ticket_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ticket_payment", {
    p_ticket_id: ticketId,
    p_received: text(formData, "received") === "true",
  });
  if (error) return { error: error.message };
  revalidateTicket(ticketId);
  return { ok: true };
}
