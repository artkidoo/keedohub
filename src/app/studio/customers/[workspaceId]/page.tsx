import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOperator } from "@/domains/production/access";
import { getStudioCustomer } from "@/domains/studio/customers";
import {
  formatStudioTime,
  studioContextLabel,
} from "@/domains/studio/presentation";
import { isValidUUIDv4 } from "@/lib/validation/id";

export const metadata = { title: "Customer" };

/**
 * One customer in full (Phase 4.1, spec §9.1).
 *
 * Everything an operator needs before producing work for this customer: who they
 * are, what they do, and their real history — requests, active projects,
 * production jobs and delivered work. Read-only: the Studio observes the
 * customer's own records and edits nothing here.
 */
export default async function StudioCustomerPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  if (!isValidUUIDv4(workspaceId)) notFound();

  const access = await requireOperator();
  const customer = await getStudioCustomer(access, workspaceId);
  if (!customer) notFound();

  const { brand, artist } = customer;

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title={customer.workspace.name}
        description={`${customer.workspace.slug} · ${customer.owner.name} · ${customer.owner.email} · workspace created ${formatStudioTime(customer.workspace.createdAt)}`}
      />

      <section aria-labelledby="profiles" className="flex min-w-0 flex-col gap-4">
        <h2 id="profiles" className="text-section">
          What they do
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Brand</CardTitle>
              <CardDescription>
                {brand
                  ? "How this customer's company presents itself."
                  : "This workspace has no Brand profile yet."}
              </CardDescription>
            </CardHeader>
            {brand ? (
              <CardContent className="flex flex-col gap-3">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Name</dt>
                    <dd className="break-words">{brand.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Industry</dt>
                    <dd className="break-words">{brand.industry ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Audience</dt>
                    <dd className="break-words">{brand.targetAudience ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Website</dt>
                    <dd className="break-words">{brand.website ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-eyebrow uppercase text-muted-foreground">
                      About
                    </dt>
                    <dd className="break-words">{brand.description ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Artist</CardTitle>
              <CardDescription>
                {artist
                  ? "How this customer's artist project presents itself."
                  : "This workspace has no Artist profile yet."}
              </CardDescription>
            </CardHeader>
            {artist ? (
              <CardContent className="flex flex-col gap-3">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Name</dt>
                    <dd className="break-words">{artist.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Genre</dt>
                    <dd className="break-words">{artist.genre ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-eyebrow uppercase text-muted-foreground">Website</dt>
                    <dd className="break-words">{artist.website ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-eyebrow uppercase text-muted-foreground">Bio</dt>
                    <dd className="break-words">{artist.bio ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </section>
      <section aria-labelledby="requests" className="flex min-w-0 flex-col gap-5">
        <h2 id="requests" className="text-section">
          Recent requests
        </h2>
        {customer.recentRequests.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {customer.recentRequests.map((entry) => (
              <li key={entry.id} className="py-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/studio/requests/${entry.id}`}
                      className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                    >
                      {entry.title}
                    </Link>
                    <p className="text-meta break-words text-muted-foreground">
                      {`${entry.category} · ${studioContextLabel(entry.contextType)} · ${formatStudioTime(entry.createdAt)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {entry.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No requests yet"
            description="When this customer sends a request it appears here and moves into the intake queue."
          />
        )}
      </section>

      <section aria-labelledby="active-projects" className="flex min-w-0 flex-col gap-5">
        <h2 id="active-projects" className="text-section">
          Active projects
        </h2>
        {customer.activeProjects.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {customer.activeProjects.map((entry) => (
              <li key={entry.id} className="py-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/studio/projects/${entry.id}`}
                      className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                    >
                      {entry.name}
                    </Link>
                    <p className="text-meta break-words text-muted-foreground">
                      {`${studioContextLabel(entry.contextType)} · started ${formatStudioTime(entry.createdAt)}`}
                    </p>
                  </div>
                  <Badge variant="brand" className="shrink-0">
                    {entry.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No projects in progress"
            description="Projects created from this customer's requests appear here while they are running."
          />
        )}
      </section>

      <section aria-labelledby="production-history" className="flex min-w-0 flex-col gap-5">
        <h2 id="production-history" className="text-section">
          Production history
        </h2>
        {customer.productionHistory.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {customer.productionHistory.map((entry) => (
              <li key={entry.id} className="py-4">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/studio/production/${entry.id}`}
                      className="inline-flex min-h-11 items-center font-medium break-words text-primary underline underline-offset-4"
                    >
                      {entry.title}
                    </Link>
                    <p className="text-meta break-words text-muted-foreground">
                      {`${entry.productionType} · opened ${formatStudioTime(entry.createdAt)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {entry.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No jobs have been run yet"
            description="Every job produced for this customer appears here with the state it is in now."
          />
        )}
      </section>

      <section aria-labelledby="delivered" className="flex min-w-0 flex-col gap-5">
        <h2 id="delivered" className="text-section">
          Delivered work
        </h2>
        {customer.deliveredWork.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {customer.deliveredWork.map((entry) => (
              <li key={entry.id} className="flex min-w-0 flex-col gap-1 py-4">
                <p className="font-medium break-words">
                  {`${entry.deliverableName} · v${entry.version}`}
                </p>
                <p className="text-meta break-words text-muted-foreground">
                  {`${studioContextLabel(entry.contextType)} · delivered ${formatStudioTime(entry.createdAt)}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing delivered yet"
            description="Approved work handed to this customer is recorded here with the version they received."
          />
        )}
      </section>
    </Container>
  );
}
