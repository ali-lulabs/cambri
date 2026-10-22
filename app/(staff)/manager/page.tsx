import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, EVENT_LABEL, STATUS_LABEL, isClosed } from "@/lib/tickets/status";
import { fmtRs, timeAgo } from "@/lib/format";
import type { ProductCategory, Role, TicketStatus } from "@/lib/types";
import { BarList } from "@/components/BarList";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, PageHeader } from "@/components/ui";

type Row = {
  status: TicketStatus;
  under_warranty: boolean | null;
  charge_amount: number | null;
  payment_received_at: string | null;
  created_at: string;
  closed_at: string | null;
  store: { name: string } | null;
  product: { category: ProductCategory } | null;
};
type EventRow = {
  id: number;
  to_status: TicketStatus;
  kind: "status" | "warranty" | "payment";
  note: string | null;
  created_at: string;
  actor: { full_name: string; role: Role } | null;
  ticket: { id: string; ticket_no: string } | null;
};

const OPEN_STEPS: TicketStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED_AT_PLANT",
  "REPAIRED",
  "REPLACED",
  "RETURN_SCHEDULED",
];
const DAY = 86_400_000;

function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return m;
}

export default async function ManagerDashboard() {
  await requireRole(["manager"]);
  const supabase = await createClient();
  const [{ data: ticketData }, { data: eventData }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "status, created_at, closed_at, under_warranty, charge_amount, payment_received_at, store:stores(name), product:product_models(category)",
      ),
    supabase
      .from("ticket_events")
      .select("id, to_status, kind, note, created_at, actor:profiles(full_name, role), ticket:tickets(id, ticket_no)")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const rows = (ticketData ?? []) as unknown as Row[];
  const events = (eventData ?? []) as unknown as EventRow[];

  const now = Date.now();
  const open = rows.filter((r) => !isClosed(r.status));
  const waiting = rows.filter((r) => r.status === "SUBMITTED");
  const oldestWaiting = waiting.reduce<string | null>((o, r) => (!o || r.created_at < o ? r.created_at : o), null);
  const delivered = rows.filter((r) => r.status === "DELIVERED" && r.closed_at);
  const delivered30 = delivered.filter((r) => now - new Date(r.closed_at!).getTime() <= 30 * DAY);
  const avgDays = delivered.length
    ? delivered.reduce((sum, r) => sum + (new Date(r.closed_at!).getTime() - new Date(r.created_at).getTime()), 0) / delivered.length / DAY
    : null;
  const decided = rows.filter((r) => r.status !== "SUBMITTED");
  const rejected = rows.filter((r) => r.status === "REJECTED");
  const rejectRate = decided.length ? Math.round((rejected.length / decided.length) * 100) : 0;

  const charged = rows.filter((r) => r.under_warranty === false && r.status !== "REJECTED");
  const unpaid = charged.filter((r) => !r.payment_received_at);
  const unpaidTotal = unpaid.reduce((s, r) => s + Number(r.charge_amount ?? 0), 0);
  const collected30 = charged
    .filter((r) => r.payment_received_at && now - new Date(r.payment_received_at).getTime() <= 30 * DAY)
    .reduce((s, r) => s + Number(r.charge_amount ?? 0), 0);

  const byStep = countBy(open, (r) => r.status);
  const byStore = countBy(rows, (r) => r.store?.name ?? "Unknown");
  const byCategory = countBy(rows, (r) => r.product?.category ?? "fan");

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Returns across all stores, live from the ticket log." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <StatTile label="Open returns" value={open.length} sub={`${rows.length} logged in total`} />
        <StatTile
          label="Awaiting review"
          value={waiting.length}
          sub={oldestWaiting ? `Oldest waiting ${timeAgo(oldestWaiting).replace(" ago", "")}` : "Queue is clear"}
        />
        <StatTile
          label="Avg. turnaround"
          value={avgDays === null ? "–" : `${avgDays.toFixed(1)} d`}
          sub="Complaint logged → delivered back"
        />
        <StatTile label="Delivered (30 days)" value={delivered30.length} sub={`${rejectRate}% of reviewed requests rejected`} />
        <Link href="/support?tab=unpaid" className="rounded-xl focus-visible:outline-2 focus-visible:outline-brand-500">
          <StatTile
            label="Payments due"
            value={fmtRs(unpaidTotal)}
            sub={`${unpaid.length} out-of-warranty job${unpaid.length === 1 ? "" : "s"} · ${fmtRs(collected30)} collected (30 d)`}
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Open returns by step" subtitle="Where units are right now" />
          <div className="p-5">
            {open.length ? (
              <BarList
                items={OPEN_STEPS.map((s) => ({ label: STATUS_LABEL[s], value: byStep.get(s) ?? 0 })).filter((i) => i.value > 0)}
              />
            ) : (
              <p className="text-sm text-slate-500">No open returns.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Returns by store" subtitle="All time" />
          <div className="p-5">
            <BarList
              items={[...byStore.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Returns by product type" subtitle="All time" />
          <div className="p-5">
            <BarList
              items={(Object.keys(CATEGORY_LABEL) as ProductCategory[])
                .map((c) => ({ label: CATEGORY_LABEL[c] + "s", value: byCategory.get(c) ?? 0 }))
                .sort((a, b) => b.value - a.value)}
            />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent activity" subtitle="Latest steps across all tickets" />
        <ul className="divide-y divide-slate-100">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <div className="min-w-0">
                {e.ticket && (
                  <Link href={`/support/tickets/${e.ticket.id}`} className="mr-2 font-mono font-medium text-brand-700 hover:underline">
                    {e.ticket.ticket_no}
                  </Link>
                )}
                <span className="text-slate-800">{e.kind === "status" ? EVENT_LABEL[e.to_status] : e.note}</span>
                <span className="text-slate-500"> · {e.actor?.full_name ?? "System"}</span>
              </div>
              <time className="text-xs text-slate-500" dateTime={e.created_at}>
                {timeAgo(e.created_at)}
              </time>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
