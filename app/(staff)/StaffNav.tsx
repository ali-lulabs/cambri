"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Inbox, PlusCircle, Settings } from "lucide-react";
import { cn } from "@/components/ui";
import type { Role } from "@/lib/types";

const ITEMS = [
  { href: "/support", label: "Ticket queue", icon: Inbox, roles: ["area_rep", "support", "manager"] },
  { href: "/support/new", label: "New ticket", icon: PlusCircle, roles: ["area_rep", "manager"] },
  { href: "/manager", label: "Dashboard", icon: BarChart3, roles: ["manager"] },
  { href: "/admin", label: "Admin", icon: Settings, roles: ["manager"] },
] as const;

export function StaffNav({ role, horizontal = false }: { role: Role; horizontal?: boolean }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => (i.roles as readonly Role[]).includes(role));
  // Highlight the most specific matching item (so /support/new isn't also "Ticket queue").
  const activeHref = items
    .filter((i) => path === i.href || path.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className={cn(horizontal ? "flex gap-1 overflow-x-auto" : "space-y-1")}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
