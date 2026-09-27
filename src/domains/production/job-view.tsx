/**
 * Read-only pieces of the production workspace (Phase 3.1).
 *
 * Server components, deliberately separate from the page so the workspace page
 * stays a readable outline of the workflow and these parts can be reused by
 * later Studio sections without dragging the whole screen along.
 *
 * Internal vocabulary is correct and expected here: this is the private
 * production surface, never rendered to a customer (spec §24).
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { QaFinding } from "./qa";
import type {
  DeliverableStatus,
  DeliverableVersion,
  Review,
  ReviewStatus,
} from "@/lib/db/schema";

/** UTC-stable timestamp for internal records. */
export function formatInstant(value: Date | null): string {
  if (!value) return "—";
  return `${value.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/** One label/value pair in a detail grid. Long values wrap; they never overflow. */
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-eyebrow text-muted-foreground uppercase">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export const deliverableStatusLabels: Record<DeliverableStatus, string> = {
  in_production: "In production",
  internal_qa: "Internal QA",
  customer_review: "With the customer",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "Waiting for the customer",
  changes_requested: "Customer asked for changes",
  approved: "Customer approved",
  superseded: "Overtaken by a newer version",
};

type JobFacts = {
  workspaceSlug: string;
  contextType: "brand" | "artist";
  brandProfileName: string | null;
  artistProfileName: string | null;
  projectName: string;
  productionType: string;
  priority: number;
  createdAt: Date;
  startedAt: Date | null;
  updatedAt: Date;
};

/** Who this work is for and what kind of production it is. */
export function JobSummary({ job }: { job: JobFacts }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The job</CardTitle>
        <CardDescription>
          Internal production record. This is KeedoHub&rsquo;s work, not the
          customer&rsquo;s.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Customer workspace" value={job.workspaceSlug} />
          <Detail
            label="Context"
            value={job.contextType === "brand" ? "Brand" : "Artist"}
          />
          <Detail
            label="Profile"
            value={job.brandProfileName ?? job.artistProfileName ?? "—"}
          />
          <Detail label="Project" value={job.projectName} />
          <Detail label="Production type" value={job.productionType} />
          <Detail label="Priority" value={String(job.priority)} />
          <Detail label="Created" value={formatInstant(job.createdAt)} />
          <Detail label="Started" value={formatInstant(job.startedAt)} />
          <Detail label="Last updated" value={formatInstant(job.updatedAt)} />
        </dl>
      </CardContent>
    </Card>
  );
}

/** The originating request, in the customer's own words. */
export function RequestCard({
  source,
}: {
  source: {
    title: string;
    description: string | null;
    category: string;
  } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What the customer asked for</CardTitle>
        <CardDescription>
          The originating request, in their own words.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {source ? (
          <div className="flex flex-col gap-3">
            <p className="font-medium break-words text-foreground">
              {source.title}
            </p>
            <p className="text-sm break-words text-muted-foreground">
              {source.description ?? "No description was given."}
            </p>
            <p className="text-meta text-muted-foreground">
              {`Category: ${source.category}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This job was not created from a customer request.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** The internal QA gate, stated honestly rather than as a pass/fail decoration. */
export function QaCard({
  ready,
  findings,
}: {
  ready: boolean;
  findings: QaFinding[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal QA gate</CardTitle>
        <CardDescription>
          Work can only be shared with the customer once every deliverable has a
          current version with a file they can actually open.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ready ? (
          <p className="text-sm text-success-foreground">
            Internal QA is satisfied — this work is ready to be shared for review.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {findings.map((finding) => (
              <li
                key={`${finding.deliverableId}-${finding.reason}`}
                className="text-sm break-words text-muted-foreground"
              >
                {`${finding.deliverableName}: ${qaReasonCopy(finding.reason)}`}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function qaReasonCopy(reason: QaFinding["reason"]): string {
  switch (reason) {
    case "no_current_version":
      return "no current version";
    case "no_file":
      return "the current version has no file";
    case "not_shared":
      return "the current file is not shared with the customer";
  }
}

/** Every version of a deliverable, newest first. Nothing is ever removed. */
export function VersionHistory({ versions }: { versions: DeliverableVersion[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">Version history</h3>
      {versions.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {versions.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 py-3">
              <p className="text-sm break-words text-foreground">
                {`Version ${entry.version}${entry.isCurrent ? " (current)" : ""}${
                  entry.assetId ? "" : " — no file attached"
                }`}
              </p>
              {entry.note ? (
                <p className="text-meta break-words text-muted-foreground">
                  {entry.note}
                </p>
              ) : null}
              <p className="text-meta text-muted-foreground">
                {`Created ${formatInstant(entry.createdAt)}${
                  entry.supersededAt
                    ? ` · superseded ${formatInstant(entry.supersededAt)}`
                    : ""
                }`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No versions yet. Produce the first one below.
        </p>
      )}
    </div>
  );
}

/**
 * The customer's decisions on this deliverable, newest first.
 *
 * Reviews are never deleted, so this is the record of how the work evolved —
 * including versions that were released and then replaced.
 */
export function ReviewRecord({ reviews }: { reviews: Review[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">
        Customer review record
      </h3>
      {reviews.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {reviews.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 py-3">
              <p className="text-sm break-words text-foreground">
                {`Version ${entry.version}: ${reviewStatusLabels[entry.status]}`}
              </p>
              {entry.feedback ? (
                <p className="text-meta break-words text-muted-foreground">
                  {`Customer said: ${entry.feedback}`}
                </p>
              ) : null}
              <p className="text-meta text-muted-foreground">
                {`Created ${formatInstant(entry.createdAt)} · updated ${formatInstant(entry.updatedAt)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No review has been opened. A review is created when this work is
          released to the customer.
        </p>
      )}
    </div>
  );
}

/** One deliverable: its status, its history, its review record, and how to add the next version. */
export function DeliverableCard({
  deliverable,
  versions,
  reviews,
  children,
}: {
  /** The fields the workspace shows; the queue read returns exactly these. */
  deliverable: {
    id: string;
    name: string;
    type: string;
    status: DeliverableStatus;
    currentVersion: number;
  };
  versions: DeliverableVersion[];
  reviews: Review[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{deliverable.name}</CardTitle>
            <CardDescription>
              {`${deliverable.type} · current version ${deliverable.currentVersion}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {deliverableStatusLabels[deliverable.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <VersionHistory versions={versions} />
        <ReviewRecord reviews={reviews} />
        {children}
      </CardContent>
    </Card>
  );
}
