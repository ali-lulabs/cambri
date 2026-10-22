"use client";

import { useActionState, useState } from "react";
import { saveCharge, setPayment } from "@/app/actions/tickets";
import { fmtDateTime, fmtRs } from "@/lib/format";
import type { TicketFull } from "@/lib/types";
import { Alert, Button } from "./ui";
import { SubmitButton } from "./SubmitButton";
import { WarrantyFields } from "./WarrantyFields";

/** Warranty decision, charge and payment for an approved ticket. */
export function ChargePanel({ ticket }: { ticket: TicketFull }) {
  // Remount when the saved values change so the form resets.
  return <Inner key={`${ticket.under_warranty}-${ticket.charge_amount}-${ticket.payment_received_at}`} ticket={ticket} />;
}

function Inner({ ticket: t }: { ticket: TicketFull }) {
  const open = t.status !== "DELIVERED" && t.status !== "REJECTED";
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction] = useActionState(saveCharge, undefined);
  const [payState, payAction] = useActionState(setPayment, undefined);
  const paid = !!t.payment_received_at;

  return (
    <div className="space-y-4 p-5">
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{t.under_warranty ? "Under warranty" : "Out of warranty"}</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {t.under_warranty ? "No charge" : fmtRs(t.charge_amount)}
            </p>
          </div>
          {open && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Change
            </Button>
          )}
        </div>
      ) : (
        <form action={saveAction} className="space-y-3">
          <input type="hidden" name="ticket_id" value={t.id} />
          {saveState?.error && <Alert>{saveState.error}</Alert>}
          <WarrantyFields defaultWarranty={t.under_warranty} defaultAmount={t.charge_amount} />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <SubmitButton className="flex-1">Save</SubmitButton>
          </div>
        </form>
      )}

      {t.under_warranty === false && !editing && (
        <div className="border-t border-slate-100 pt-4">
          {payState?.error && (
            <div className="mb-3">
              <Alert>{payState.error}</Alert>
            </div>
          )}
          {paid ? (
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium text-emerald-700">Payment received</p>
                <p className="text-xs text-slate-500">
                  {fmtDateTime(t.payment_received_at!)}
                  {t.payer && ` · ${t.payer.full_name}`}
                </p>
              </div>
              <form action={payAction}>
                <input type="hidden" name="ticket_id" value={t.id} />
                <input type="hidden" name="received" value="false" />
                <SubmitButton variant="ghost" size="sm" pendingText="…">
                  Undo
                </SubmitButton>
              </form>
            </div>
          ) : (
            <form action={payAction} className="space-y-2">
              <input type="hidden" name="ticket_id" value={t.id} />
              <input type="hidden" name="received" value="true" />
              <p className="text-sm font-medium text-orange-700">Payment not received yet</p>
              <SubmitButton variant="success" className="w-full" pendingText="Saving…">
                Mark {fmtRs(t.charge_amount)} received
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
