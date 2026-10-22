import { ShieldCheck, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/tickets/status";
import { fmtDateTime } from "@/lib/format";
import type { TicketStatus } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { StageProgress } from "@/components/StageProgress";
import { Card } from "@/components/ui";

type VerifyRow = {
  ticket_no: string;
  status: TicketStatus;
  store_name: string;
  retailer: string;
  product_name: string;
  model_code: string;
  serial_no: string;
  replacement_serial_no: string | null;
  pickup_dispatcher: string | null;
  pickup_vehicle: string | null;
  return_dispatcher: string | null;
  return_vehicle: string | null;
  updated_at: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Verify slip" };

/** Public page opened by scanning a slip's QR code. Read-only, limited fields. */
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let row: VerifyRow | null = null;
  if (UUID.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_ticket_by_token", { p_token: token });
    row = ((data as VerifyRow[] | null) ?? [])[0] ?? null;
  }

  const dispatcherNow =
    row && (["RETURN_SCHEDULED", "DELIVERED"] as TicketStatus[]).includes(row.status)
      ? { label: "Return dispatcher", name: row.return_dispatcher, vehicle: row.return_vehicle }
      : row?.pickup_dispatcher
        ? { label: "Pickup dispatcher", name: row.pickup_dispatcher, vehicle: row.pickup_vehicle }
        : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <div className="mb-6">
        <Logo />
      </div>
      {!row ? (
        <Card className="p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 size-10 text-red-600" aria-hidden />
          <h1 className="text-lg font-semibold text-slate-900">Slip not recognised</h1>
          <p className="mt-1 text-sm text-slate-500">This code doesn&apos;t match any ticket. Do not hand over any unit; contact support.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 bg-emerald-50 px-5 py-4 text-emerald-900">
            <ShieldCheck className="size-7 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="font-semibold">Valid slip</p>
              <p className="text-sm">Issued for {row.store_name}</p>
            </div>
          </div>
          <div className="space-y-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-slate-500">{row.ticket_no}</p>
                <p className="text-lg font-semibold text-slate-900">{row.product_name}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <StageProgress status={row.status} />
            <dl className="divide-y divide-slate-100 text-sm">
              <Item label="Model">{row.model_code}</Item>
              <Item label="Serial no.">
                <span className="font-mono">{row.serial_no}</span>
              </Item>
              {row.replacement_serial_no && (
                <Item label="Replacement serial">
                  <span className="font-mono">{row.replacement_serial_no}</span>
                </Item>
              )}
              {dispatcherNow && (
                <Item label={dispatcherNow.label}>
                  {dispatcherNow.name}
                  {dispatcherNow.vehicle && <span className="block text-xs text-slate-500">{dispatcherNow.vehicle}</span>}
                </Item>
              )}
              <Item label="Current step">{STATUS_LABEL[row.status]}</Item>
              <Item label="Last update">{fmtDateTime(row.updated_at)}</Item>
            </dl>
          </div>
        </Card>
      )}
    </main>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
    </div>
  );
}
