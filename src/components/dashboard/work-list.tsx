import Link from "next/link";

import { DashboardList } from "@/components/dashboard/section";
import type { DashboardWork } from "@/domains/dashboard/queries";
import type { WorkspaceContext } from "@/lib/navigation";

export function WorkList({ items, context }: { items: DashboardWork[]; context: WorkspaceContext }) {
  return (
    <DashboardList>
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-heading font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.projectName} · Version {item.version}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.status === "customer_review" ? "Waiting for your review" : item.delivered ? "Delivered" : "Approved"}
            </p>
          </div>
          <Link href={`/workspace/${context}/work/${item.id}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary underline underline-offset-4">
            Open work<span className="sr-only">: {item.name}</span>
          </Link>
        </li>
      ))}
    </DashboardList>
  );
}
