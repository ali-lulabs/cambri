import { createClient } from "@/lib/supabase/server";
import { assignAreaRep, createStore, deleteStore } from "@/app/actions/admin";
import { InlineSelectForm } from "@/components/InlineSelectForm";
import type { Store } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { AdminTable, Td } from "@/components/AdminTable";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, Field, Input } from "@/components/ui";

export default async function StoresAdmin() {
  const supabase = await createClient();
  const [{ data }, { data: tickets }, { data: areaReps }] = await Promise.all([
    supabase.from("stores").select("*").order("retailer").order("name"),
    supabase.from("tickets").select("store_id"),
    supabase.from("profiles").select("id, full_name").eq("role", "area_rep").order("full_name"),
  ]);
  const repOptions = [
    { value: "", label: "None (managers review)" },
    ...(areaReps ?? []).map((r) => ({ value: r.id, label: r.full_name })),
  ];
  const stores = (data ?? []) as Store[];
  const counts = new Map<string, number>();
  for (const t of tickets ?? []) counts.set(t.store_id, (counts.get(t.store_id) ?? 0) + 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <AdminTable head={["Store", "Location", "Area rep", "Store manager", "Tickets", ""]}>
        {stores.map((s) => (
          <tr key={s.id}>
            <Td>
              <p className="font-medium text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{s.retailer}</p>
            </Td>
            <Td>
              {s.city}
              {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
            </Td>
            <Td>
              <InlineSelectForm
                action={assignAreaRep}
                hidden={{ id: s.id }}
                name="area_rep_id"
                label={`Area rep for ${s.name}`}
                options={repOptions}
                defaultValue={s.area_rep_id ?? ""}
              />
            </Td>
            <Td className="text-slate-600">{s.manager_contact ?? "—"}</Td>
            <Td className="tabular-nums">{counts.get(s.id) ?? 0}</Td>
            <Td>
              <DeleteButton action={deleteStore} id={s.id} confirmText={`Remove ${s.name}?`} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      <Card className="self-start">
        <CardHeader title="Add store" />
        <ActionForm action={createStore} className="space-y-3 p-5">
          <Field label="Store name" htmlFor="name">
            <Input id="name" name="name" required placeholder="e.g. HomeMax Gulberg" />
          </Field>
          <Field label="Retailer" htmlFor="retailer">
            <Input id="retailer" name="retailer" required />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" required />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" />
          </Field>
          <Field label="Store manager contact" htmlFor="manager_contact">
            <Input id="manager_contact" name="manager_contact" placeholder="Name · phone" />
          </Field>
          <SubmitButton className="w-full">Add store</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
