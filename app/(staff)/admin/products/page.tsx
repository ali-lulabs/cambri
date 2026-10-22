import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/app/actions/admin";
import { CATEGORY_LABEL } from "@/lib/tickets/status";
import type { ProductModel } from "@/lib/types";
import { ActionForm } from "@/components/ActionForm";
import { ActiveToggle } from "@/components/ActiveToggle";
import { AdminTable, Td } from "@/components/AdminTable";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui";

export default async function ProductsAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("product_models").select("*").order("category").order("model_code");
  const products = (data ?? []) as ProductModel[];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <AdminTable head={["Model code", "Name", "Type", "Status"]}>
        {products.map((p) => (
          <tr key={p.id}>
            <Td className="font-mono font-medium">{p.model_code}</Td>
            <Td>{p.name}</Td>
            <Td>{CATEGORY_LABEL[p.category]}</Td>
            <Td>
              <ActiveToggle kind="products" id={p.id} active={p.active} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      <Card className="self-start">
        <CardHeader title="Add product model" subtitle="Inactive models are hidden from the complaint form." />
        <ActionForm action={createProduct} className="space-y-3 p-5">
          <Field label="Type" htmlFor="category">
            <Select id="category" name="category" required defaultValue="fan">
              {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Model code" htmlFor="model_code">
            <Input id="model_code" name="model_code" required className="font-mono uppercase" placeholder="e.g. CF-48" />
          </Field>
          <Field label="Name" htmlFor="pname">
            <Input id="pname" name="name" required placeholder="e.g. Ceiling Fan 48&quot;" />
          </Field>
          <SubmitButton className="w-full">Add model</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
