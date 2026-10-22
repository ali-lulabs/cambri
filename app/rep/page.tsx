import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets/queries";
import { isClosed } from "@/lib/tickets/status";
import { TicketCard } from "@/components/TicketCard";
import { Card, EmptyState, LinkButton } from "@/components/ui";

export default async function RepHome() {
  const supabase = await createClient();
  const { data } = await supabase.from("tickets").select(TICKET_LIST_SELECT).order("updated_at", { ascending: false }).limit(100);
  const tickets = (data ?? []) as unknown as TicketListRow[];
  const open = tickets.filter((t) => !isClosed(t.status));
  const closed = tickets.filter((t) => isClosed(t.status));

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">My store&apos;s returns</h1>
        <p className="text-sm text-slate-500">
          {open.length} open · {closed.length} closed
        </p>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <EmptyState title="No complaints yet" body="When a store manager reports a faulty unit, log it here." />
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Open" items={open} />
          {closed.length > 0 && <Section title="Closed" items={closed} />}
        </div>
      )}

      {/* Thumb-reachable primary action. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <LinkButton href="/rep/new" size="lg" className="w-full">
            <Plus className="size-5" aria-hidden /> New complaint
          </LinkButton>
        </div>
      </div>
    </>
  );
}

function Section({ title, items }: { title: string; items: TicketListRow[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-2.5">
        {items.map((t) => (
          <TicketCard key={t.id} t={t} href={`/rep/tickets/${t.id}`} />
        ))}
      </div>
    </section>
  );
}
