"use client";

import { useActionState, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { approveTicket, transitionTicket } from "@/app/actions/tickets";
import { WarrantyFields } from "./WarrantyFields";
import type { Dispatcher, TicketStatus } from "@/lib/types";
import { Alert, Button, Field, Input, Select, Textarea } from "./ui";
import { SubmitButton } from "./SubmitButton";

type Props = { ticketId: string; status: TicketStatus; dispatchers: Dispatcher[] };

/** Shows only the actions that are valid for the ticket's current step. */
export function ActionPanel({ ticketId, status, dispatchers }: Props) {
  // Remount on status change so stale errors/inputs are cleared.
  return <Steps key={status} ticketId={ticketId} status={status} dispatchers={dispatchers} />;
}

function Steps({ ticketId, status, dispatchers }: Props) {
  const [mode, setMode] = useState<"a" | "b">("a");

  switch (status) {
    case "SUBMITTED":
      return mode === "a" ? (
        <ApproveForm ticketId={ticketId}>
          <div className="flex gap-2">
            <SubmitButton variant="success" className="flex-1" pendingText="Approving…">
              Approve
            </SubmitButton>
            <Button type="button" variant="danger" className="flex-1" onClick={() => setMode("b")}>
              Reject…
            </Button>
          </div>
        </ApproveForm>
      ) : (
        <StepForm ticketId={ticketId} to="REJECTED" title="Reject request" help="The store rep will see this reason.">
          <NoteField required label="Reason" placeholder="e.g. Physical damage, not covered by warranty" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setMode("a")}>
              Back
            </Button>
            <SubmitButton variant="danger" className="flex-1" pendingText="Rejecting…">
              Confirm reject
            </SubmitButton>
          </div>
        </StepForm>
      );

    case "APPROVED":
      return (
        <StepForm ticketId={ticketId} to="PICKUP_SCHEDULED" title="Schedule pickup" help="Assigning a dispatcher creates the pickup slip.">
          <DispatcherField dispatchers={dispatchers} />
          <NoteField placeholder="Optional instructions for the dispatcher" />
          <SubmitButton className="w-full" pendingText="Generating slip…">
            Assign &amp; create pickup slip
          </SubmitButton>
        </StepForm>
      );

    case "PICKUP_SCHEDULED":
      return (
        <StepForm ticketId={ticketId} to="PICKED_UP" title="Pickup in progress" help="Mark it collected once the dispatcher has the unit.">
          <NoteField placeholder="Optional note" />
          <SubmitButton className="w-full">Mark collected from store</SubmitButton>
        </StepForm>
      );

    case "PICKED_UP":
      return (
        <StepForm ticketId={ticketId} to="RECEIVED_AT_PLANT" title="In transit to plant" help="Confirm when the unit arrives at the plant.">
          <NoteField placeholder="Optional note, e.g. bay number" />
          <SubmitButton className="w-full">Mark received at plant</SubmitButton>
        </StepForm>
      );

    case "RECEIVED_AT_PLANT":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {(["a", "b"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={mode === m ? "rounded-md bg-white py-1.5 shadow-sm" : "py-1.5 text-slate-600"}
              >
                {m === "a" ? "Repaired" : "Replaced"}
              </button>
            ))}
          </div>
          {mode === "a" ? (
            <StepForm ticketId={ticketId} to="REPAIRED" title="Record repair" help="The same unit goes back to the store.">
              <NoteField label="What was fixed?" placeholder="e.g. Replaced motor capacitor, tested OK" />
              <SubmitButton className="w-full">Mark repaired</SubmitButton>
            </StepForm>
          ) : (
            <StepForm ticketId={ticketId} to="REPLACED" title="Record replacement" help="A new unit goes back to the store.">
              <Field label="New unit serial no." htmlFor="replacement_serial">
                <Input id="replacement_serial" name="replacement_serial" required className="font-mono uppercase" autoComplete="off" />
              </Field>
              <NoteField placeholder="Optional note, e.g. why not repairable" />
              <SubmitButton className="w-full">Mark replaced</SubmitButton>
            </StepForm>
          )}
        </div>
      );

    case "REPAIRED":
    case "REPLACED":
      return (
        <StepForm ticketId={ticketId} to="RETURN_SCHEDULED" title="Schedule return" help="Assigning a dispatcher creates the return slip.">
          <DispatcherField dispatchers={dispatchers} />
          <NoteField placeholder="Optional instructions" />
          <SubmitButton className="w-full" pendingText="Generating slip…">
            Assign &amp; create return slip
          </SubmitButton>
        </StepForm>
      );

    case "RETURN_SCHEDULED":
      return (
        <StepForm ticketId={ticketId} to="DELIVERED" title="Out for return" help="Close the ticket once the store has the unit.">
          <NoteField placeholder="Optional note, e.g. received by" />
          <SubmitButton variant="success" className="w-full">
            Mark delivered to store
          </SubmitButton>
        </StepForm>
      );

    default:
      return (
        <div className="flex items-start gap-3 text-sm text-slate-600">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
          <p>This ticket is closed. No further action needed.</p>
        </div>
      );
  }
}

function StepForm({
  ticketId,
  to,
  title,
  help,
  children,
}: {
  ticketId: string;
  to: TicketStatus;
  title: string;
  help: string;
  children: ReactNode;
}) {
  const [state, action] = useActionState(transitionTicket, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="to" value={to} />
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{help}</p>
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      {children}
    </form>
  );
}

function ApproveForm({ ticketId, children }: { ticketId: string; children: ReactNode }) {
  const [state, action] = useActionState(approveTicket, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div>
        <p className="font-medium text-slate-900">Review this request</p>
        <p className="text-sm text-slate-500">Approve to arrange a pickup from the store.</p>
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      <WarrantyFields />
      <NoteField placeholder="Optional note, e.g. invoice checked" />
      {children}
    </form>
  );
}

function NoteField({ label = "Note", placeholder, required }: { label?: string; placeholder?: string; required?: boolean }) {
  return (
    <Field label={label} htmlFor="note">
      <Textarea id="note" name="note" rows={2} placeholder={placeholder} required={required} />
    </Field>
  );
}

function DispatcherField({ dispatchers }: { dispatchers: Dispatcher[] }) {
  return (
    <Field label="Dispatcher" htmlFor="dispatcher_id">
      <Select id="dispatcher_id" name="dispatcher_id" required defaultValue="">
        <option value="" disabled>
          Choose a dispatcher…
        </option>
        {dispatchers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.vehicle ? ` · ${d.vehicle}` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}
