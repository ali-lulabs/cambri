import { createClient } from "@/lib/supabase/server";
import { createDispatcher } from "@/app/actions/admin";
import type { Dispatcher } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { ActiveToggle } from "@/components/ActiveToggle";
import { AdminTable, Td } from "@/components/AdminTable";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, Field, Input } from "@/components/ui";

export default async function DispatchersAdmin() {
  const supabase = await createClient();
  const [{ data }, { data: open }] = await Promise.all([
    supabase.from("dispatchers").select("*").order("name"),
    supabase
      .from("tickets")
      .select("status, pickup_dispatcher_id, return_dispatcher_id")
      .in("status", ["PICKUP_SCHEDULED", "RETURN_SCHEDULED"]),
  ]);
  const dispatchers = (data ?? []) as Dispatcher[];
  const jobs = new Map<string, number>();
  for (const t of open ?? []) {
    const id = t.status === "PICKUP_SCHEDULED" ? t.pickup_dispatcher_id : t.return_dispatcher_id;
    if (id) jobs.set(id, (jobs.get(id) ?? 0) + 1);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <AdminTable head={["Name", "Phone", "Vehicle", "Trips in progress", "Status"]}>
        {dispatchers.map((d) => (
          <tr key={d.id}>
            <Td className="font-medium text-slate-900">{d.name}</Td>
            <Td>{d.phone ?? "—"}</Td>
            <Td>{d.vehicle ?? "—"}</Td>
            <Td className="tabular-nums">{jobs.get(d.id) ?? 0}</Td>
            <Td>
              <ActiveToggle kind="dispatchers" id={d.id} active={d.active} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      <Card className="self-start">
        <CardHeader title="Add dispatcher" subtitle="Inactive dispatchers can't be assigned new trips." />
        <ActionForm action={createDispatcher} className="space-y-3 p-5">
          <Field label="Name" htmlFor="dname">
            <Input id="dname" name="name" required />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" />
          </Field>
          <Field label="Vehicle" htmlFor="vehicle">
            <Input id="vehicle" name="vehicle" placeholder="e.g. Bike · LEA-1234" />
          </Field>
          <SubmitButton className="w-full">Add dispatcher</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
