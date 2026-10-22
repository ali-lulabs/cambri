"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { TicketStatus } from "@/lib/types";
import type { FormState } from "./auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Store rep logs a new complaint for their store. */
export async function createTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  if (!profile || profile.role !== "rep" || !profile.store_id) return { error: "Only store reps can log complaints." };

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
      store_id: profile.store_id,
      product_model_id,
      serial_no,
      issue_description,
      store_manager_name,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save the complaint." };

  revalidatePath("/rep");
  redirect(`/rep/tickets/${data.id}?created=1`);
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
