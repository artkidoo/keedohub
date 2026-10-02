/**
 * Production instructions, read and edited (Phase 4.3, spec §8).
 *
 * The read view is generated from `INSTRUCTION_FIELDS`, the same list the editor
 * is generated from, so what an operator can write and what the workspace shows
 * can never drift apart. Only fields the operator has actually filled in appear;
 * the rest are counted, so an unfinished brief says so in one line instead of
 * rendering a wall of empty headings (spec §7).
 */

import { ClipboardList } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { INSTRUCTION_FIELDS, type ProductionInstructions } from "./brief";
import { ProductionInstructionsForm } from "./production-instructions-form";

export function ProductionInstructionsCard({
  jobId,
  instructions,
  /** One honest line from the lifecycle about what this job is doing now. */
  context,
}: {
  jobId: string;
  instructions: ProductionInstructions;
  context?: string;
}) {
  const recorded = INSTRUCTION_FIELDS.filter((field) => instructions[field.key]);
  const missing = INSTRUCTION_FIELDS.length - recorded.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production instructions</CardTitle>
        <CardDescription>
          {context ??
            "Internal direction for this job. Only KeedoHub reads it; the customer never sees it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {recorded.length ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            {recorded.map((field) => (
              <div key={field.key} className="flex min-w-0 flex-col gap-1">
                <dt className="text-eyebrow uppercase text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="text-sm break-words whitespace-pre-line text-foreground">
                  {instructions[field.key]}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No production instructions recorded"
            description="Write down what this piece of work has to do — objective, direction, dimensions, format — so anyone picking it up knows how to produce it."
          />
        )}

        {missing > 0 ? (
          <p className="text-meta text-muted-foreground">
            {`${missing} of ${INSTRUCTION_FIELDS.length} instruction fields are still empty.`}
          </p>
        ) : null}

        <details className="rounded-xl border border-border bg-surface/60 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            {recorded.length ? "Edit production instructions" : "Write production instructions"}
          </summary>
          <div className="pt-5">
            <ProductionInstructionsForm jobId={jobId} instructions={instructions} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
