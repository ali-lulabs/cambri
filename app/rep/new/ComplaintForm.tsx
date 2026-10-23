"use client";

import { useActionState } from "react";
import { createTicket } from "@/app/actions/tickets";
import { Alert, Field, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CATEGORY_LABEL } from "@/lib/tickets/status";
import type { ProductModel, Store } from "@/lib/types";

export function ComplaintForm({
  products,
  stores,
  cancelHref = "/rep",
}: {
  products: ProductModel[];
  /** Area reps and managers choose the store; store reps log for their own. */
  stores?: Pick<Store, "id" | "name" | "city">[];
  cancelHref?: string;
}) {
  const [state, action] = useActionState(createTicket, undefined);
  const groups = (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((c) => ({
    category: c,
    items: products.filter((p) => p.category === c),
  }));

  return (
    <form action={action} className="space-y-5">
      {state?.error && <Alert>{state.error}</Alert>}

      {stores && (
        <Field label="Store" htmlFor="store_id">
          <Select id="store_id" name="store_id" required defaultValue={stores.length === 1 ? stores[0].id : ""}>
            <option value="" disabled>
              Choose a store…
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.city}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Product model" htmlFor="product_model_id">
        <Select id="product_model_id" name="product_model_id" required defaultValue="">
          <option value="" disabled>
            Choose a model…
          </option>
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <optgroup key={g.category} label={CATEGORY_LABEL[g.category] + "s"}>
                  {g.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.model_code} · {p.name}
                    </option>
                  ))}
                </optgroup>
              ),
          )}
        </Select>
      </Field>

      <Field label="Serial number" htmlFor="serial_no" hint="Printed on the label under or behind the unit.">
        <Input
          id="serial_no"
          name="serial_no"
          required
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="e.g. MW-25G-240137"
          className="font-mono uppercase"
        />
      </Field>

      <Field label="What's wrong with it?" htmlFor="issue_description">
        <Textarea
          id="issue_description"
          name="issue_description"
          required
          rows={4}
          placeholder="Describe the fault as reported by the customer or store."
        />
      </Field>

      <Field label="Reported by (store manager)" htmlFor="store_manager_name">
        <Input id="store_manager_name" name="store_manager_name" required autoComplete="off" placeholder="Full name" />
      </Field>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="secondary" size="lg">
          Cancel
        </LinkButton>
        <SubmitButton size="lg" pendingText="Submitting…">
          Submit complaint
        </SubmitButton>
      </div>
    </form>
  );
}
