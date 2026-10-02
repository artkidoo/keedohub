/**
 * Output requirements, foregrounded per production type (Phase 4.3, spec §14).
 *
 * This is the part of the workspace that adapts. Cover artwork leads with
 * dimensions, format and export; social content leads with platform, dimensions
 * and copy; a document leads with page format and copy — because the production
 * type decides which fields an operator actually has to settle (see
 * production-types). Nothing is invented: a field with no value says so.
 */

import { Ruler } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import type { OutputRequirement } from "./requirements";

export function OutputRequirementsCard({
  typeLabel,
  requirements,
}: {
  /** The customer-facing production type label, e.g. "Cover artwork". */
  typeLabel: string;
  requirements: OutputRequirement[];
}) {
  const missing = requirements.filter((entry) => entry.value === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Output requirements</CardTitle>
        <CardDescription>
          {`What ${typeLabel.toLowerCase()} has to be produced as. Values come from the production instructions or the customer's own requirements — never from a guess.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {requirements.length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {requirements.map((entry) => (
              <div key={entry.field} className="flex min-w-0 flex-col gap-1">
                <dt className="text-eyebrow uppercase text-muted-foreground">
                  {entry.label}
                </dt>
                <dd
                  className={
                    entry.value
                      ? "text-sm break-words text-foreground"
                      : "text-sm break-words text-muted-foreground"
                  }
                >
                  {entry.value ?? "Not recorded yet"}
                </dd>
                {entry.value && entry.source ? (
                  <p className="text-meta text-muted-foreground">
                    {entry.source === "brief"
                      ? "From the production instructions"
                      : "From the customer's request"}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
        ) : (
          <EmptyState
            icon={Ruler}
            title="No output requirements for this production type"
            description="Nothing specific has to be settled for this kind of work. Produce to the brief."
          />
        )}

        {missing.length && requirements.length ? (
          <p className="text-meta text-muted-foreground">
            {`Still to settle: ${missing.map((entry) => entry.label.toLowerCase()).join(", ")}.`}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
