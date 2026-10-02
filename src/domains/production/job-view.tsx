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
import { ProductionFilePreview } from "@/domains/creative/production-file-preview";
import { DeliveryButton } from "./delivery-button";
import { deliveryRefusalLabels, type DeliveryReadiness, type DeliveryRefusal } from "./delivery-state";
import type { ProductionContext } from "./customer-context";
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
  /** The operator currently doing this work, or null when nobody has taken it. */
  assignedOperatorName: string | null;
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
          <Detail
            label="Assigned to"
            value={job.assignedOperatorName ?? "Unassigned"}
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

/** The file fields a version's file needs to be previewed (Phase 4.3). */
export type DeliverableAsset = {
  id: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  category: string;
  customerVisible: boolean;
  createdAt: Date;
};

/**
 * Every version of a deliverable, newest first. Nothing is ever removed.
 *
 * Since Phase 4.3 each version also shows the file it was produced as — an
 * inline preview when the format can be painted safely, a file card when it
 * cannot — because an operator must be able to tell what they uploaded without
 * leaving the workspace (spec §12). The file is matched to its version by asset
 * id, never by version number, so a version can never show another version's
 * file.
 */
export function VersionHistory({
  versions,
  assets = [],
}: {
  versions: DeliverableVersion[];
  /** The files recorded for this deliverable. Empty is honest: no preview. */
  assets?: DeliverableAsset[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground">Version history</h3>
      {versions.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {versions.map((entry) => {
            const file = entry.assetId
              ? assets.find((asset) => asset.id === entry.assetId)
              : undefined;

            return (
              <li key={entry.id} className="flex flex-col gap-3 py-4">
                <p className="text-sm break-words text-foreground">
                  {`Version ${entry.version}${entry.isCurrent ? " (current)" : ""}${
                    entry.assetId ? "" : " — no file attached"
                  }`}
                </p>
                {entry.note ? (
                  <p className="text-meta break-words whitespace-pre-line text-muted-foreground">
                    {entry.note}
                  </p>
                ) : null}
                {file ? (
                  <ProductionFilePreview
                    asset={file}
                    caption={`File for version ${entry.version}`}
                  />
                ) : null}
                <p className="text-meta text-muted-foreground">
                  {`Created ${formatInstant(entry.createdAt)}${
                    entry.supersededAt
                      ? ` · superseded ${formatInstant(entry.supersededAt)}`
                      : ""
                  }`}
                </p>
              </li>
            );
          })}
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

/** Internal wording for a refusal, used only on the private production surface. */
function deliveryRefusalCopy(reason: DeliveryRefusal | undefined): string {
  return reason ? deliveryRefusalLabels[reason] : "This work cannot be delivered yet";
}

/**
 * The delivery panel for one deliverable (Phase 3.2).
 *
 * Answers the three questions an operator has before pressing the button — has
 * the customer approved, which version, and what will be delivered — and shows
 * the real reason when delivery is not yet possible. The decision itself is the
 * `DeliveryButton` form, which posts to the server action and is re-checked
 * there.
 */
export function DeliveryCard({
  deliverableId,
  version,
  readiness,
  context,
  delivery: made,
}: {
  deliverableId: string;
  /** The current version — the only version that could ever be delivered. */
  version: number;
  readiness: DeliveryReadiness;
  context: {
    approved: boolean;
    reviewStatus: string | null;
    reviewedVersion: number | null;
    assetId: string | null;
  } | null;
  delivery: {
    version: number;
    assetId: string | null;
    createdAt: Date;
  } | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-foreground">Delivery</h3>

      {made ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">
            {`Delivered version ${made.version} to the customer on ${formatInstant(made.createdAt)}.`}
          </p>
          <p className="text-meta text-muted-foreground">
            The delivered file is now in the customer&rsquo;s Library. This record
            is final and cannot be edited.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-sm break-words text-foreground">
              {context?.approved
                ? `Customer approved version ${context.reviewedVersion}.`
                : "The customer has not approved this work yet."}
            </p>
            <p className="text-meta break-words text-muted-foreground">
              {`Current version: ${version}. ${
                context?.assetId
                  ? "A customer-visible file is attached to it."
                  : "No customer-visible file is attached to it yet."
              }`}
            </p>
          </div>

          {readiness.ready ? (
            <DeliveryButton deliverableId={deliverableId} version={version} />
          ) : (
            <p className="text-meta text-muted-foreground">
              {`Cannot deliver yet: ${deliveryRefusalCopy(
                readiness.reason ?? "",
              ).toLowerCase()}.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** One deliverable: its status, its history, its review record, and how to add the next version. */
export function DeliverableCard({
  deliverable,
  versions,
  reviews,
  assets = [],
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
  /** The files recorded for this deliverable, so each version can show its own. */
  assets?: DeliverableAsset[];
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
        <VersionHistory versions={versions} assets={assets} />
        <ReviewRecord reviews={reviews} />
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * The customer's creative direction, read straight from the profile the job is
 * bound to (Phase 4.2, spec §8).
 *
 * This is deliberately read-only: it renders the customer's Brand DNA or Artist
 * identity as facts and colour swatches, and offers no way to change it from the
 * production workspace. Every value shown is one the customer actually supplied —
 * an empty profile says so plainly rather than padding the screen — and colours
 * are only painted when they are a real, validated colour, so a stray value is
 * shown as text instead of becoming a style.
 */
export function CustomerContextCard({
  context,
}: {
  context: ProductionContext | null;
}) {
  const kindLabel = context?.kind === "artist" ? "Artist" : "Brand";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${kindLabel} creative direction`}</CardTitle>
        <CardDescription>
          Read-only context from the customer&rsquo;s profile. Production cannot
          change it from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!context || !context.hasContent ? (
          <p className="text-sm break-words text-muted-foreground">
            {`No ${kindLabel.toLowerCase()} creative direction has been recorded for this work yet. Work from the brief and the customer’s request.`}
          </p>
        ) : (
          <>
            {context.colours.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-eyebrow uppercase text-muted-foreground">
                  Colour palette
                </span>
                <ul className="flex flex-wrap gap-3">
                  {context.colours.map((entry) => (
                    <li key={entry.role} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-6 w-6 shrink-0 rounded border border-border"
                        style={{ backgroundColor: entry.colour }}
                      />
                      <span className="text-meta text-muted-foreground">
                        {`${entry.role}: ${entry.colour}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <dl className="grid gap-4 sm:grid-cols-2">
              {context.facts.map((entry) => (
                <Detail key={entry.label} label={entry.label} value={entry.value} />
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
