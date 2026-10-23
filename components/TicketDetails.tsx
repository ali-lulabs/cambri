import type { ReactNode } from "react";
import { CATEGORY_LABEL } from "@/lib/tickets/status";
import { fmtDateTime, fmtRs } from "@/lib/format";
import type { Dispatcher, TicketFull } from "@/lib/types";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2.5 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  );
}

const dispatcherText = (d: Dispatcher | null) =>
  d ? [d.name, d.phone, d.vehicle].filter(Boolean).join(" · ") : null;

export function TicketDetails({ ticket, showStore = true }: { ticket: TicketFull; showStore?: boolean }) {
  const t = ticket;
  return (
    <dl className="divide-y divide-slate-100">
      <Row label="Product">
        {t.product.name}
        <span className="text-slate-500"> · {t.product.model_code} · {CATEGORY_LABEL[t.product.category]}</span>
      </Row>
      <Row label="Serial no.">
        <span className="font-mono">{t.serial_no}</span>
      </Row>
      <Row label="Issue">{t.issue_description}</Row>
      {showStore && (
        <Row label="Store">
          {t.store.name}
          <span className="text-slate-500"> · {t.store.city}</span>
          {t.store.address && <span className="block text-xs text-slate-500">{t.store.address}</span>}
        </Row>
      )}
      {showStore && <Row label="Area rep">{t.store.area_rep?.full_name ?? <span className="text-slate-500">None (managers review)</span>}</Row>}
      <Row label="Reported by">{t.store_manager_name} (store manager)</Row>
      <Row label="Logged by">
        {t.creator?.full_name ?? "—"} <span className="text-slate-500">· {fmtDateTime(t.created_at)}</span>
      </Row>
      {t.approver && <Row label="Approved by">{t.approver.full_name}</Row>}
      <Row label="Warranty">
        {t.under_warranty === null ? (
          <span className="text-slate-500">Decided by support on approval</span>
        ) : t.under_warranty ? (
          "Under warranty · no charge"
        ) : (
          <span className="font-medium">Out of warranty · {fmtRs(t.charge_amount)} charge</span>
        )}
      </Row>
      {t.under_warranty === false && (
        <Row label="Payment">
          {t.payment_received_at ? (
            <span className="text-emerald-700">
              Received {fmtDateTime(t.payment_received_at)}
              {t.payer && <span className="text-slate-500"> · recorded by {t.payer.full_name}</span>}
            </span>
          ) : (
            <span className="font-medium text-orange-700">Not received yet</span>
          )}
        </Row>
      )}
      {t.rejection_reason && (
        <Row label="Rejection reason">
          <span className="text-red-700">{t.rejection_reason}</span>
        </Row>
      )}
      {t.pickup && <Row label="Pickup by">{dispatcherText(t.pickup)}</Row>}
      {t.resolution && (
        <Row label="Resolution">
          {t.resolution === "repair" ? (
            "Repaired"
          ) : (
            <>
              Replaced with new unit <span className="font-mono">{t.replacement_serial_no}</span>
            </>
          )}
        </Row>
      )}
      {t.ret && <Row label="Return by">{dispatcherText(t.ret)}</Row>}
    </dl>
  );
}
