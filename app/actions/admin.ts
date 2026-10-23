"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import type { FormState } from "./auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function assertManager() {
  const p = await getProfile();
  if (!p || p.role !== "manager") throw new Error("Managers only");
}

function friendly(message: string) {
  if (message.includes("violates foreign key")) return "This is used by existing tickets or users, so it can't be deleted.";
  if (message.includes("duplicate key")) return "That already exists.";
  return message;
}

export async function createStore(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const row = {
    name: text(f, "name"),
    retailer: text(f, "retailer"),
    city: text(f, "city"),
    address: text(f, "address") || null,
    manager_contact: text(f, "manager_contact") || null,
  };
  if (!row.name || !row.retailer || !row.city) return { error: "Name, retailer and city are required." };
  const { error } = await (await createClient()).from("stores").insert(row);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/admin/stores");
  return { ok: true, message: `Added ${row.name}.` };
}

export async function createProduct(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const row = { category: text(f, "category"), model_code: text(f, "model_code").toUpperCase(), name: text(f, "name") };
  if (!row.category || !row.model_code || !row.name) return { error: "All fields are required." };
  const { error } = await (await createClient()).from("product_models").insert(row);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/admin/products");
  return { ok: true, message: `Added ${row.model_code}.` };
}

export async function createDispatcher(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const row = { name: text(f, "name"), phone: text(f, "phone") || null, vehicle: text(f, "vehicle") || null };
  if (!row.name) return { error: "Name is required." };
  const { error } = await (await createClient()).from("dispatchers").insert(row);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/admin/dispatchers");
  return { ok: true, message: `Added ${row.name}.` };
}

const TOGGLE_TABLES = { products: "product_models", dispatchers: "dispatchers" } as const;

export async function toggleActive(f: FormData) {
  await assertManager();
  const kind = text(f, "kind") as keyof typeof TOGGLE_TABLES;
  const table = TOGGLE_TABLES[kind];
  if (!table) return;
  await (await createClient())
    .from(table)
    .update({ active: text(f, "active") !== "true" })
    .eq("id", text(f, "id"));
  revalidatePath(`/admin/${kind}`);
}

export async function deleteStore(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const { error } = await (await createClient()).from("stores").delete().eq("id", text(f, "id"));
  if (error) return { error: friendly(error.message) };
  revalidatePath("/admin/stores");
  return { ok: true };
}

export async function createUser(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const email = text(f, "email").toLowerCase();
  const full_name = text(f, "full_name");
  const password = text(f, "password");
  const role = text(f, "role");
  const store_id = text(f, "store_id") || null;

  if (!email || !full_name || !password || !role) return { error: "All fields are required." };
  if (!["rep", "area_rep", "support", "manager"].includes(role)) return { error: "Choose a valid role." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (role === "rep" && !store_id) return { error: "Store reps need a store." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: friendly(error?.message ?? "Could not create user.") };

  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id,
    email,
    full_name,
    role,
    store_id: role === "rep" ? store_id : null,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: friendly(pErr.message) };
  }
  revalidatePath("/admin/users");
  return { ok: true, message: `Created ${email}.` };
}

export async function deleteUser(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const me = await getProfile();
  const id = text(f, "id");
  if (id === me?.id) return { error: "You can't remove your own account." };
  const admin = createAdminClient();
  // Keep the profile if it appears on tickets (audit history), just block sign-in.
  const { error } = await admin.from("profiles").delete().eq("id", id);
  if (error) {
    const { error: banErr } = await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    if (banErr) return { error: banErr.message };
    revalidatePath("/admin/users");
    return { ok: true, message: "User has ticket history, so their access was disabled instead of deleted." };
  }
  await admin.auth.admin.deleteUser(id);
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Move a store rep to another store. */
export async function moveRep(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const id = text(f, "id");
  const store_id = text(f, "store_id");
  if (!store_id) return { error: "Choose a store." };
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ store_id })
    .eq("id", id)
    .eq("role", "rep")
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!data?.length) return { error: "Only store reps can be moved." };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Assign (or clear) the area rep who reviews a store's tickets. */
export async function assignAreaRep(_prev: FormState, f: FormData): Promise<FormState> {
  await assertManager();
  const { error } = await (await createClient())
    .from("stores")
    .update({ area_rep_id: text(f, "area_rep_id") || null })
    .eq("id", text(f, "id"));
  if (error) return { error: friendly(error.message) };
  revalidatePath("/admin/stores");
  revalidatePath("/admin/users");
  return { ok: true };
}
