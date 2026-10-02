/**
 * Where this job is and what happens next (Phase 4.3, spec §16, §21).
 *
 * One card, two facts, and no controls. It never offers a state change: moving a
 * job is done through `JobControls`, which posts to the lifecycle's own server
 * action, and the lifecycle refuses anything it does not allow. This card only
 * tells the truth about where the work stands, including when the operator is
 * not the one who has to act (spec §19).
 */

import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { nextProductionStep } from "./next-step";
import { jobStatusLabels } from "@/domains/production/job-controls";
import type { JobStatus } from "@/lib/db/schema";

export function ProductionSummary({ status }: { status: JobStatus }) {
  const step = nextProductionStep(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next production step</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-eyebrow uppercase text-muted-foreground">
          {`Internal state: ${jobStatusLabels[status]}`}
        </p>
        <p className="flex items-center gap-2 text-heading font-semibold text-foreground">
          <ArrowRight aria-hidden className="size-4 shrink-0 text-primary" />
          {step.title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
        {!step.actionable ? (
          <p className="text-meta text-muted-foreground">
            Nothing to produce until the workflow moves on. The controls below
            offer only the moves this state allows.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
