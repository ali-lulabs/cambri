import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUser, deleteUser } from "@/app/actions/admin";
import { getProfile } from "@/lib/auth";
import type { Profile, Store } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { AdminTable, Td } from "@/components/AdminTable";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui";

const ROLE_LABEL = { rep: "Store rep", support: "Support", manager: "Manager" } as const;

export default async function UsersAdmin() {
  const me = await getProfile();
  const supabase = await createClient();
  const [{ data: profiles }, { data: stores }, authUsers] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, store_id, store:stores(name, retailer, city)").order("role").order("full_name"),
    supabase.from("stores").select("id, name").order("name"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const disabled = new Set(
    (authUsers.data?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id),
  );
  const users = (profiles ?? []) as unknown as Profile[];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <AdminTable head={["Name", "Email", "Role", "Store", ""]}>
        {users.map((u) => (
          <tr key={u.id} className={disabled.has(u.id) ? "opacity-50" : ""}>
            <Td className="font-medium text-slate-900">
              {u.full_name}
              {disabled.has(u.id) && <span className="ml-2 text-xs font-normal text-slate-500">(disabled)</span>}
            </Td>
            <Td className="text-slate-600">{u.email}</Td>
            <Td>{ROLE_LABEL[u.role]}</Td>
            <Td>{u.store?.name ?? "—"}</Td>
            <Td>
              {u.id !== me?.id && !disabled.has(u.id) && (
                <DeleteButton action={deleteUser} id={u.id} confirmText={`Remove access for ${u.full_name}?`} />
              )}
            </Td>
          </tr>
        ))}
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
              <option value="rep">Store rep</option>
              <option value="support">Support</option>
              <option value="manager">Manager</option>
            </Select>
          </Field>
          <Field label="Store (store reps only)" htmlFor="store_id">
            <Select id="store_id" name="store_id" defaultValue="">
              <option value="">—</option>
              {((stores ?? []) as Pick<Store, "id" | "name">[]).map((s) => (
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
