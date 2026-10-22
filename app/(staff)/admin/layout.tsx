import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["manager"]);
  return (
    <>
      <PageHeader title="Admin" subtitle="Manage the stores, products, dispatchers and people using the app." />
      <AdminTabs />
      {children}
    </>
  );
}
