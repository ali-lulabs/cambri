import { redirect } from "next/navigation";
import { getProfile, homeFor } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui";
import { LoginForm } from "./LoginForm";

const DEMO_ACCOUNTS = [
  { label: "Store rep", email: "rep.central@example.com" },
  { label: "Support", email: "support@example.com" },
  { label: "Manager", email: "manager@example.com" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await getProfile();
  if (profile) redirect(homeFor(profile.role));
  const { error } = await searchParams;
  const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== "false";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">Track returns from store to plant and back.</p>
          <LoginForm initialError={error === "no-access" ? "Your account has no access yet. Ask a manager to set up your role." : undefined} />
        </Card>
        {showDemo && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-600">
            <p className="mb-2 font-medium text-slate-700">Demo accounts · password Demo1234!</p>
            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex justify-between gap-3">
                  <span className="text-slate-500">{a.label}</span>
                  <span className="font-mono">{a.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
