import { signOut } from "@/app/actions/auth";
import { cn } from "./ui";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={cn("text-sm font-medium hover:underline", className)}>
        Sign out
      </button>
    </form>
  );
}
