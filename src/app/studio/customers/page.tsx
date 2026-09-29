import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { listStudioCustomers } from "@/domains/studio/customers";
import { formatStudioTime } from "@/domains/studio/presentation";

export const metadata = { title: "Customers" };

/**
 * The customer roster (Phase 4.1, spec §9).
 *
 * One row per workspace — a customer who works in both Brand and Artist is one
 * customer with two profiles, not two customers. The counts are the numbers an
 * operator actually asks about: how much has been asked, how much is running,
 * how much is out for delivery.
 *
 * Owner email appears here because this is an internal surface where identity
 * matters; no credential of any kind is ever loaded (spec §19, §16).
 */
export default async function StudioCustomersPage() {
  const access = await requireOperator();
  const customers = await listStudioCustomers(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Customers"
        description="Every workspace, what they have asked for, and what is moving for them."
      />

      {customers.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {customers.map((entry) => (
            <li key={entry.workspaceId} className="py-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/studio/customers/${entry.workspaceId}`}
                    className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                  >
                    {entry.workspaceName}
                  </Link>
                  <p className="text-meta break-words text-muted-foreground">
                    {`${entry.slug} · ${entry.ownerName} · ${entry.ownerEmail} · since ${formatStudioTime(entry.createdAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {entry.brandName ? (
                    <Badge variant="outline">{`Brand · ${entry.brandName}`}</Badge>
                  ) : null}
                  {entry.artistName ? (
                    <Badge variant="outline">{`Artist · ${entry.artistName}`}</Badge>
                  ) : null}
                  <Badge variant="neutral">{`${entry.requests} requests`}</Badge>
                  <Badge variant="neutral">{`${entry.projects} projects`}</Badge>
                  <Badge variant={entry.activeJobs ? "brand" : "neutral"}>
                    {`${entry.activeJobs} active jobs`}
                  </Badge>
                  <Badge variant="success">{`${entry.deliveries} delivered`}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No customers yet"
          description="A workspace appears here as soon as a customer signs in and creates one."
        />
      )}
    </Container>
  );
}
