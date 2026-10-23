import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyStores, getProfile } from "@/lib/auth";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets/queries";
import { QUEUE_TABS } from "@/lib/tickets/status";
import { fmtDateTime, timeAgo } from "@/lib/format";
import type { TicketStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ChargeBadge } from "@/components/ChargeBadge";
import { TicketCard } from "@/components/TicketCard";
import { Alert, Card, EmptyState, Input, PageHeader, cn } from "@/components/ui";

type TabKey = (typeof QUEUE_TABS)[number]["key"];

export default async function SupportQueue({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const profile = (await getProfile())!;
  const role = profile.role;
  // Support doesn't handle payments; area reps don't see the plant's queue first.
  const tabs = QUEUE_TABS.filter((t) => t.key !== "unpaid" || role !== "support");
  const defaultTab: TabKey = role === "support" ? "pickup" : "review";
  const tabKey = (tabs.some((t) => t.key === sp.tab) ? sp.tab : defaultTab) as TabKey;
  const tab = QUEUE_TABS.find((t) => t.key === tabKey)!;
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, "");

  const supabase = await createClient();
  const [myStores, { data: all }, listRes] = await Promise.all([
    role === "area_rep" ? getMyStores() : Promise.resolve([]),
    supabase.from("tickets").select("status, under_warranty, payment_received_at"),
    (() => {
      let query = supabase.from("tickets").select(TICKET_LIST_SELECT).order("updated_at", { ascending: tabKey === "review" });
      if (tab.statuses.length) query = query.in("status", tab.statuses as unknown as TicketStatus[]);
      if (tabKey === "unpaid") query = query.eq("under_warranty", false).is("payment_received_at", null).neq("status", "REJECTED");
      if (q) query = query.or(`ticket_no.ilike.%${q}%,serial_no.ilike.%${q}%`);
      return query.limit(200);
    })(),
  ]);
  const tickets = (listRes.data ?? []) as unknown as TicketListRow[];

  const rows = all ?? [];
  const counts = Object.fromEntries(
    QUEUE_TABS.map((t) => [
      t.key,
      t.key === "unpaid"
        ? rows.filter((r) => r.under_warranty === false && !r.payment_received_at && r.status !== "REJECTED").length
        : t.statuses.length
          ? rows.filter((r) => (t.statuses as readonly string[]).includes(r.status)).length
          : rows.length,
    ]),
  );

  const href = (k: string) => `/support?tab=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader
        title="Ticket queue"
        subtitle={
          role === "area_rep"
            ? `Your stores: ${myStores.map((s) => s.name).join(", ") || "none yet"}`
            : role === "support"
              ? "All stores. Arrange pickups, record repairs and send units back."
              : "All stores. Review new complaints and follow each return."
        }
      />
      {role === "area_rep" && myStores.length === 0 && (
        <div className="mb-4">
          <Alert tone="info">No stores are assigned to you yet. Ask a manager to assign your stores.</Alert>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-1 rounded-lg bg-slate-200/60 p-1">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={href(t.key)}
                aria-current={t.key === tabKey ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
                  t.key === tabKey ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    (t.key === "review" || t.key === "unpaid") && counts[t.key] > 0
                      ? t.key === "review"
                        ? "bg-amber-500 text-white"
                        : "bg-orange-500 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {counts[t.key]}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <form className="relative lg:w-72" action="/support">
          <input type="hidden" name="tab" value={tabKey} />
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search ticket or serial no." className="pl-9" aria-label="Search" />
        </form>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState
            title={q ? "No matching tickets" : "Nothing here"}
            body={q ? "Try a different ticket or serial number." : "Tickets will appear here when they reach this step."}
          />
        </Card>
      ) : (
        <>
          {/* Phones */}
          <div className="space-y-2.5 md:hidden">
            {tickets.map((t) => (
              <TicketCard key={t.id} t={t} href={`/support/tickets/${t.id}`} />
            ))}
          </div>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3 text-right">{tabKey === "review" ? "Logged" : "Last update"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="group relative hover:bg-brand-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/support/tickets/${t.id}`} className="font-mono font-medium text-brand-700 after:absolute after:inset-0">
                        {t.ticket_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{t.product?.name}</p>
                      <p className="font-mono text-xs text-slate-500">{t.serial_no}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.store?.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ChargeBadge {...t} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500" title={fmtDateTime(tabKey === "review" ? t.created_at : t.updated_at)}>
                      {timeAgo(tabKey === "review" ? t.created_at : t.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
