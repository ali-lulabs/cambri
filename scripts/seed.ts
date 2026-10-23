/**
 * Seeds demo data: stores, product models, dispatchers, demo logins and
 * sample tickets at different stages.
 *
 *   npm run seed           # safe to re-run; skips data that already exists
 *   npm run seed -- --reset   # deletes all tickets first, then recreates samples
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo1234!";
const reset = process.argv.includes("--reset");

type Res = { data: unknown; error: { message: string } | null };
function check<R extends Res>(res: R, what: string): NonNullable<R["data"]> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<R["data"]>;
}

const STORES = [
  { name: "HomeMax Central", retailer: "HomeMax", city: "Central City", address: "12 Market Road", manager_contact: "Sara Malik · 0300 1112233" },
  { name: "HomeMax Riverside", retailer: "HomeMax", city: "Riverside", address: "88 River Plaza", manager_contact: "Omar Khan · 0300 2223344" },
  { name: "ValueHub Mall", retailer: "ValueHub", city: "Central City", address: "Level 2, Grand Mall", manager_contact: "Nadia Shah · 0300 3334455" },
  { name: "MegaStore North", retailer: "MegaStore", city: "Northfield", address: "5 Industrial Ave", manager_contact: "Bilal Ahmed · 0300 4445566" },
];

const PRODUCTS = [
  { category: "fan", model_code: "CF-56", name: "Ceiling Fan 56\"" },
  { category: "fan", model_code: "PF-18", name: "Pedestal Fan 18\"" },
  { category: "fan", model_code: "TF-12", name: "Table Fan 12\"" },
  { category: "microwave", model_code: "MW-20S", name: "Microwave 20L Solo" },
  { category: "microwave", model_code: "MW-25G", name: "Microwave 25L Grill" },
  { category: "microwave", model_code: "MW-30C", name: "Microwave 30L Convection" },
  { category: "blender", model_code: "BL-500", name: "Blender 500W" },
  { category: "blender", model_code: "BL-750", name: "Blender 750W with Grinder" },
  { category: "blender", model_code: "BL-1000", name: "Pro Blender 1000W" },
];

const DISPATCHERS = [
  { name: "Asad Iqbal", phone: "0301 5550101", vehicle: "Bike · LEA-2231" },
  { name: "Hamza Raza", phone: "0301 5550102", vehicle: "Van · LES-7710" },
  { name: "Usman Tariq", phone: "0301 5550103", vehicle: "Bike · LEB-4419" },
];

type DemoUser = {
  email: string;
  full_name: string;
  role: "rep" | "area_rep" | "support" | "manager";
  /** Store reps: their store. */
  storeIndex?: number;
  /** Area reps: stores they cover (only filled where a store has no area rep yet). */
  covers?: number[];
};
const USERS: DemoUser[] = [
  { email: "manager@example.com", full_name: "Ayesha Siddiqui", role: "manager" },
  { email: "support@example.com", full_name: "Fahad Mirza", role: "support" },
  { email: "rep.central@example.com", full_name: "Zain Ali", role: "rep", storeIndex: 0 },
  { email: "rep.riverside@example.com", full_name: "Hira Noor", role: "rep", storeIndex: 1 },
  { email: "rep.valuehub@example.com", full_name: "Danish Akram", role: "rep", storeIndex: 2 },
  { email: "rep.north@example.com", full_name: "Mariam Javed", role: "rep", storeIndex: 3 },
  { email: "area.central@example.com", full_name: "Imran Qureshi", role: "area_rep", covers: [0, 1] },
  { email: "area.north@example.com", full_name: "Sana Farooq", role: "area_rep", covers: [2, 3] },
];

const ISSUES = [
  "Unit does not power on out of the box.",
  "Loud grinding noise at high speed.",
  "Turntable not rotating; unit sparks inside.",
  "Motor overheats and shuts off after 2 minutes.",
  "Display shows error E3 and buttons unresponsive.",
  "Blade wobbles, visible crack in jar base.",
  "Remote not working, speed stuck on 1.",
  "Door latch broken, microwave will not start.",
];

// Journey for each sample ticket: final status + step gaps in hours.
const JOURNEYS: { path: string[]; ageDays: number }[] = [
  { path: ["SUBMITTED"], ageDays: 0.1 },
  { path: ["SUBMITTED"], ageDays: 0.4 },
  { path: ["SUBMITTED"], ageDays: 1 },
  { path: ["SUBMITTED", "APPROVED"], ageDays: 1.2 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED"], ageDays: 2 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP"], ageDays: 3 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT"], ageDays: 4 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT", "REPAIRED"], ageDays: 5 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT", "REPLACED", "RETURN_SCHEDULED"], ageDays: 6 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT", "REPAIRED", "RETURN_SCHEDULED", "DELIVERED"], ageDays: 9 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT", "REPLACED", "RETURN_SCHEDULED", "DELIVERED"], ageDays: 12 },
  { path: ["SUBMITTED", "APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_PLANT", "REPAIRED", "RETURN_SCHEDULED", "DELIVERED"], ageDays: 15 },
  { path: ["SUBMITTED", "REJECTED"], ageDays: 3 },
  { path: ["SUBMITTED", "REJECTED"], ageDays: 8 },
];

const NOTES: Record<string, string> = {
  APPROVED: "Approved for pickup.",
  REJECTED: "Physical damage from customer misuse; not covered by warranty.",
  PICKUP_SCHEDULED: "Pickup slip issued.",
  PICKED_UP: "Collected from store against slip.",
  RECEIVED_AT_PLANT: "Received at service bay.",
  REPAIRED: "Replaced faulty capacitor and tested.",
  REPLACED: "Unit not repairable; swapped with new stock.",
  RETURN_SCHEDULED: "Return slip issued.",
  DELIVERED: "Handed over to store manager.",
};

async function ensureUsers(storeIds: string[]) {
  const existing = check(await db.auth.admin.listUsers({ perPage: 1000 }), "list users");
  const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));
  const ids: Record<string, string> = {};

  for (const u of USERS) {
    let id = byEmail.get(u.email);
    if (!id) {
      const created = check(
        await db.auth.admin.createUser({ email: u.email, password: DEMO_PASSWORD, email_confirm: true }),
        `create user ${u.email}`,
      );
      id = created.user!.id;
    }
    // Only create missing profiles, so manual edits to demo accounts are kept.
    check(
      await db.from("profiles").upsert(
        {
          id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          store_id: u.storeIndex === undefined ? null : storeIds[u.storeIndex],
        },
        { onConflict: "id", ignoreDuplicates: true },
      ),
      `profile ${u.email}`,
    );
    ids[u.email] = id;
  }
  return ids;
}

async function main() {
  if (reset) {
    console.log("Deleting existing tickets…");
    check(await db.from("tickets").delete().not("id", "is", null), "delete tickets");
  }

  // Reference data (only seeded when empty).
  let stores = check(await db.from("stores").select("id,name").order("created_at"), "read stores");
  if (stores.length === 0) {
    stores = check(await db.from("stores").insert(STORES).select("id,name"), "insert stores");
  }
  // Keep the store order stable for rep assignment.
  const storeIds = STORES.map((s) => stores.find((x) => x.name === s.name)?.id ?? stores[0].id);

  check(await db.from("product_models").upsert(PRODUCTS, { onConflict: "model_code" }), "upsert products");
  const products = check(await db.from("product_models").select("id,category,model_code"), "read products");

  let dispatchers = check(await db.from("dispatchers").select("id"), "read dispatchers");
  if (dispatchers.length === 0) {
    dispatchers = check(await db.from("dispatchers").insert(DISPATCHERS).select("id"), "insert dispatchers");
  }

  const userIds = await ensureUsers(storeIds);
  const supportId = userIds["support@example.com"];

  // Assign area reps to stores that don't have one yet (safe on live data).
  const areaRepByStore: Record<string, string> = {};
  for (const u of USERS.filter((x) => x.role === "area_rep")) {
    for (const idx of u.covers ?? []) {
      const sid = storeIds[idx];
      areaRepByStore[sid] = userIds[u.email];
      check(
        await db.from("stores").update({ area_rep_id: userIds[u.email] }).eq("id", sid).is("area_rep_id", null),
        `assign area rep ${u.email}`,
      );
    }
  }
  const repByStore = USERS.filter((u) => u.role === "rep").map((u) => userIds[u.email]);

  const { count } = await db.from("tickets").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log(`Tickets already exist (${count}); skipping sample tickets. Use --reset to recreate.`);
  } else {
    const now = Date.now();
    for (const [i, j] of JOURNEYS.entries()) {
      const storeIdx = i % storeIds.length;
      const product = products[(i * 4) % products.length];
      const createdAt = new Date(now - j.ageDays * 86_400_000);
      const finalStatus = j.path[j.path.length - 1];
      const pickup = dispatchers[i % dispatchers.length].id;
      const ret = dispatchers[(i + 1) % dispatchers.length].id;
      const reached = (s: string) => j.path.includes(s);
      // Every third approved ticket is an out-of-warranty paid repair; paid once it is on its way back.
      const approved = reached("APPROVED");
      const charge = approved && i % 3 === 1 ? [1500, 2500, 3200, 4800][i % 4] : null;
      const paid = charge !== null && (reached("RETURN_SCHEDULED") || reached("DELIVERED"));
      const reviewerId = areaRepByStore[storeIds[storeIdx]] ?? supportId;

      // Steps are spread evenly between creation and "now - 1h".
      const span = Math.max(now - 3_600_000 - createdAt.getTime(), 3_600_000);
      const stepAt = (k: number) => new Date(createdAt.getTime() + (span * k) / Math.max(j.path.length - 1, 1));

      const ticket = check(
        await db
          .from("tickets")
          .insert({
            store_id: storeIds[storeIdx],
            product_model_id: product.id,
            serial_no: `${product.model_code}-${(240000 + i * 137).toString()}`,
            issue_description: ISSUES[i % ISSUES.length],
            store_manager_name: STORES[storeIdx].manager_contact.split(" · ")[0],
            status: finalStatus,
            created_by: repByStore[storeIdx],
            created_at: createdAt.toISOString(),
            updated_at: stepAt(j.path.length - 1).toISOString(),
            approved_by: reached("APPROVED") ? reviewerId : null,
            rejection_reason: reached("REJECTED") ? NOTES.REJECTED : null,
            pickup_dispatcher_id: reached("PICKUP_SCHEDULED") ? pickup : null,
            return_dispatcher_id: reached("RETURN_SCHEDULED") ? ret : null,
            resolution: reached("REPLACED") ? "replace" : reached("REPAIRED") ? "repair" : null,
            replacement_serial_no: reached("REPLACED") ? `${product.model_code}-R${(910000 + i).toString()}` : null,
            closed_at: reached("DELIVERED") || reached("REJECTED") ? stepAt(j.path.length - 1).toISOString() : null,
            under_warranty: approved ? charge === null : null,
            charge_amount: charge,
            payment_received_at: paid ? stepAt(j.path.length - 1).toISOString() : null,
            payment_received_by: paid ? reviewerId : null,
          })
          .select("id")
          .single(),
        "insert ticket",
      );

      // The insert trigger logged SUBMITTED; add the remaining steps.
      const events = j.path.slice(1).map((to, k) => ({
        ticket_id: ticket.id,
        actor_id: to === "APPROVED" || to === "REJECTED" ? reviewerId : supportId,
        kind: "status",
        from_status: j.path[k],
        to_status: to,
        note: NOTES[to] ?? null,
        created_at: stepAt(k + 1).toISOString(),
      }));
      const rs = (n: number) => "Rs " + n.toLocaleString("en-PK");
      const extra = [];
      if (approved) {
        extra.push({
          ticket_id: ticket.id,
          actor_id: reviewerId,
          from_status: "SUBMITTED",
          to_status: "SUBMITTED",
          kind: "warranty",
          note: charge === null ? "Under warranty, no charge" : `Out of warranty, charge ${rs(charge)}`,
          created_at: new Date(stepAt(1).getTime() - 60_000).toISOString(),
        });
      }
      if (paid) {
        const last = j.path[j.path.length - 1];
        extra.push({
          ticket_id: ticket.id,
          actor_id: reviewerId,
          from_status: last,
          to_status: last,
          kind: "payment",
          note: `Payment of ${rs(charge!)} received`,
          created_at: stepAt(j.path.length - 1).toISOString(),
        });
      }
      if (events.length + extra.length) check(await db.from("ticket_events").insert([...events, ...extra]), "insert events");
    }
    console.log(`Created ${JOURNEYS.length} sample tickets.`);
  }

  console.log("\nDemo logins (password: " + DEMO_PASSWORD + ")");
  for (const u of USERS) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
