import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUser, deleteUser, moveRep } from "@/app/actions/admin";
import { getProfile } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import type { Profile, Store } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { AdminTable, Td } from "@/components/AdminTable";
import { DeleteButton } from "@/components/DeleteButton";
import { InlineSelectForm } from "@/components/InlineSelectForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui";

const ROLE_ORDER = { manager: 0, support: 1, area_rep: 2, rep: 3 } as const;

export default async function UsersAdmin() {
  const me = await getProfile();
  const supabase = await createClient();
  const [{ data: profiles }, { data: storeRows }, authUsers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, store_id, store:stores!profiles_store_id_fkey(name, retailer, city)")
      .order("full_name"),
    supabase.from("stores").select("id, name, area_rep_id").order("name"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const disabled = new Set(
    (authUsers.data?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id),
  );
  const stores = (storeRows ?? []) as Pick<Store, "id" | "name" | "area_rep_id">[];
  const users = ((profiles ?? []) as unknown as Profile[]).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <AdminTable head={["Name", "Email", "Role", "Store(s)", ""]}>
        {users.map((u) => {
          const off = disabled.has(u.id);
          const covered = u.role === "area_rep" ? stores.filter((s) => s.area_rep_id === u.id) : [];
          return (
            <tr key={u.id} className={off ? "opacity-50" : ""}>
              <Td className="font-medium text-slate-900">
                {u.full_name}
                {off && <span className="ml-2 text-xs font-normal text-slate-500">(disabled)</span>}
              </Td>
              <Td className="text-slate-600">{u.email}</Td>
              <Td>{ROLE_LABEL[u.role]}</Td>
              <Td>
                {u.role === "rep" && !off ? (
                  <InlineSelectForm
                    action={moveRep}
                    hidden={{ id: u.id }}
                    name="store_id"
                    label={`Store for ${u.full_name}`}
                    options={storeOptions}
                    defaultValue={u.store_id ?? ""}
                  />
                ) : u.role === "area_rep" ? (
                  covered.length ? (
                    covered.map((s) => s.name).join(", ")
                  ) : (
                    <span className="text-slate-500">None yet. Assign on Stores.</span>
                  )
                ) : u.role === "rep" ? (
                  u.store?.name
                ) : (
                  <span className="text-slate-400">All stores</span>
                )}
              </Td>
              <Td>
                {u.id !== me?.id && !off && (
                  <DeleteButton action={deleteUser} id={u.id} confirmText={`Remove access for ${u.full_name}?`} />
                )}
              </Td>
            </tr>
          );
        })}
      </AdminTable>

      <Card className="self-start">
        <CardHeader title="Add user" subtitle="They can sign in straight away with this password." />
        <ActionForm action={createUser} className="space-y-3 p-5">
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" required />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Temporary password" htmlFor="password" hint="At least 8 characters.">
            <Input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
          </Field>
          <Field label="Role" htmlFor="role">
            <Select id="role" name="role" required defaultValue="rep">
              <option value="rep">Store rep: logs complaints at one store</option>
              <option value="area_rep">Area rep: reviews tickets for their stores</option>
              <option value="support">Support: plant team, pickup to return</option>
              <option value="manager">Manager: full access</option>
            </Select>
          </Field>
          <Field label="Store (store reps only)" htmlFor="store_id" hint="Assign an area rep's stores on the Stores tab.">
            <Select id="store_id" name="store_id" defaultValue="">
              <option value="">—</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <SubmitButton className="w-full">Create user</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
