import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTicket } from "@/lib/tickets/queries";
import { Alert, Card, CardHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { StageProgress } from "@/components/StageProgress";
import { TicketDetails } from "@/components/TicketDetails";
import { Timeline } from "@/components/Timeline";

export default async function RepTicket({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const result = await getTicket(id);
  if (!result) notFound();
  const { ticket, events } = result;

  return (
    <div className="space-y-4">
      <Link href="/rep" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="size-4" aria-hidden /> My returns
      </Link>

      {created && (
        <Alert tone="success">
          Complaint <strong>{ticket.ticket_no}</strong> submitted. Support has been notified on their dashboard.
        </Alert>
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-slate-500">{ticket.ticket_no}</p>
            <h1 className="text-lg font-semibold text-slate-900">{ticket.product.name}</h1>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <StageProgress status={ticket.status} />
      </Card>

      <Card>
        <CardHeader title="Details" />
        <div className="px-5 py-1">
          <TicketDetails ticket={ticket} showStore={false} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Activity" subtitle="Every step, who did it and when" />
        <div className="p-5">
          <Timeline events={events} />
        </div>
      </Card>
    </div>
  );
}
