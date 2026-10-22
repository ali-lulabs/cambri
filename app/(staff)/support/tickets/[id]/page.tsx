import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { getActiveDispatchers, getTicket } from "@/lib/tickets/queries";
import { fmtDateTime } from "@/lib/format";
import { ActionPanel } from "@/components/ActionPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { StageProgress } from "@/components/StageProgress";
import { TicketDetails } from "@/components/TicketDetails";
import { Timeline } from "@/components/Timeline";
import { Card, CardHeader, buttonClass } from "@/components/ui";

export default async function SupportTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, dispatchers] = await Promise.all([getTicket(id), getActiveDispatchers()]);
  if (!result) notFound();
  const { ticket, events } = result;

  const slips = [
    ticket.pickup_dispatcher_id && { type: "pickup", label: "Pickup slip", who: ticket.pickup?.name },
    ticket.return_dispatcher_id && { type: "return", label: "Return slip", who: ticket.ret?.name },
  ].filter(Boolean) as { type: string; label: string; who?: string }[];

  return (
    <>
      <Link href="/support" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="size-4" aria-hidden /> Ticket queue
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-slate-900 sm:text-2xl">{ticket.ticket_no}</h1>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {ticket.product.name} · {ticket.store.name} · logged {fmtDateTime(ticket.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <StageProgress status={ticket.status} />
          </Card>
          <Card>
            <CardHeader title="Details" />
            <div className="px-5 py-1">
              <TicketDetails ticket={ticket} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Activity" subtitle="Audit trail of every step" />
            <div className="p-5">
              <Timeline events={events} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <Card className="p-5">
            <ActionPanel ticketId={ticket.id} status={ticket.status} dispatchers={dispatchers} />
          </Card>
          {slips.length > 0 && (
            <Card>
              <CardHeader title="Slips" subtitle="Print, or show on a phone. The store can scan the QR code to check it." />
              <ul className="divide-y divide-slate-100">
                {slips.map((s) => (
                  <li key={s.type} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-5 shrink-0 text-brand-600" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{s.label}</p>
                        <p className="truncate text-xs text-slate-500">{s.who}</p>
                      </div>
                    </div>
                    <a
                      href={`/api/tickets/${ticket.id}/slip?type=${s.type}`}
                      target="_blank"
                      rel="noopener"
                      className={buttonClass("secondary", "sm")}
                    >
                      Open PDF
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
