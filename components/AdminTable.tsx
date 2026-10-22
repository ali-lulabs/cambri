import type { ReactNode } from "react";
import { Card } from "./ui";

/** Simple responsive table: scrolls horizontally on small screens. */
export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h, i) => (
              <th key={h || i} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </Card>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
