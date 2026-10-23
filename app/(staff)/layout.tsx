import { STAFF_ROLES, requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { StaffNav } from "./StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(STAFF_ROLES);
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-800 px-4 py-5 lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <Logo inverted />
        <div className="mt-8 flex-1">
          <StaffNav role={profile.role} />
        </div>
        <div className="border-t border-white/10 pt-4 text-sm">
          <p className="font-medium text-white">{profile.full_name}</p>
          <p className="mb-2 text-xs text-brand-100">{ROLE_LABEL[profile.role]}</p>
          <SignOutButton className="text-brand-100" />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="bg-brand-800 px-4 pb-2 pt-3 lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <Logo inverted />
          <SignOutButton className="text-brand-100" />
        </div>
        <StaffNav role={profile.role} horizontal />
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
