import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role, Store } from "@/lib/types";

export const homeFor = (role: Role) => (role === "rep" ? "/rep" : role === "manager" ? "/manager" : "/support");

/** Roles that work in the staff area (queue, ticket pages). */
export const STAFF_ROLES: Role[] = ["area_rep", "support", "manager"];

/** The signed-in user's profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  // Verified locally against Supabase's published signing keys; no Auth round trip.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, store_id, store:stores!profiles_store_id_fkey(name, retailer, city)")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

/** Redirects away unless the user has one of the given roles. */
export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=no-access");
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return profile;
}

/**
 * Stores this user can log and review tickets for:
 * all stores for managers, assigned stores for area reps, none otherwise.
 */
export const getMyStores = cache(async (): Promise<Pick<Store, "id" | "name" | "city">[]> => {
  const profile = await getProfile();
  if (!profile || (profile.role !== "manager" && profile.role !== "area_rep")) return [];
  const supabase = await createClient();
  let query = supabase.from("stores").select("id, name, city").order("name");
  if (profile.role === "area_rep") query = query.eq("area_rep_id", profile.id);
  const { data } = await query;
  return data ?? [];
});
