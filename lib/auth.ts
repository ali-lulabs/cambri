import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export const homeFor = (role: Role) => (role === "rep" ? "/rep" : role === "manager" ? "/manager" : "/support");

/** The signed-in user's profile, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, store_id, store:stores(name, retailer, city)")
    .eq("id", user.id)
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
