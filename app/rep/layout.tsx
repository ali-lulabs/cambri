import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["rep"]);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-brand-800 text-white shadow">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link href="/rep" aria-label="My tickets">
            <Logo inverted />
          </Link>
          <SignOutButton className="text-brand-100" />
        </div>
        <div className="border-t border-white/10 bg-brand-900/40">
          <p className="mx-auto max-w-xl truncate px-4 py-1.5 text-xs text-brand-100">
            {profile.full_name} · {profile.store?.name}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">{children}</main>
    </div>
  );
}
