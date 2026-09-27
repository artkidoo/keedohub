"use client";

import { Loader2, PlayCircle, UserRound } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { assignJobAction, transitionJobAction } from "@/domains/production/actions";
import { initialProductionState } from "@/domains/production/state";
import { jobTransitions } from "@/domains/production/lifecycle";
import type { JobStatus } from "@/lib/db/schema";

/** How an operator says a queue state out loud. Internal vocabulary. */
export const jobStatusLabels: Record<JobStatus, string> = {
  incoming: "Incoming",
  briefing: "Briefing",
  in_production: "In production",
  internal_qa: "Internal QA",
  customer_review: "With the customer",
  changes_requested: "Changes requested",
  approved: "Approved",
  delivered: "Delivered",
};

/** What moving a job to a state actually does, shown as the button's tooltip text. */
const jobActionHints: Partial<Record<JobStatus, string>> = {
  briefing: "Start briefing — assembling what is needed to produce this work.",
  in_production: "Start producing this work.",
  internal_qa: "Send the finished work to internal QA.",
  customer_review: "Share this version with the customer for review.",
  approved: "Back to producing — the customer asked for changes.",
};

type JobControlsProps = {
  jobId: string;
  status: JobStatus;
  operators: { id: string; displayName: string | null; role: string }[];
  assignedOperatorId: string | null;
};

/**
 * The two controls that move a job forward: who is working on it, and what
 * happens next.
 *
 * The moves offered are exactly the ones the lifecycle allows from the current
 * state — computed from the same table the server enforces — so the interface
 * cannot offer a move the server would refuse, and it never renders a status
 * picker. Every action re-authorises server-side; these buttons are a
 * convenience, never the control (spec §19.4).
 */
export function JobControls({
  jobId,
  status,
  operators,
  assignedOperatorId,
}: JobControlsProps) {
  const [assignState, assignAction, assigning] = useActionState(
    assignJobAction,
    initialProductionState,
  );
  const [moveState, moveAction, moving] = useActionState(
    transitionJobAction,
    initialProductionState,
  );

  const nextStates = jobTransitions[status];
  const message = moveState.message ?? assignState.message;

  return (
    <div className="flex flex-col gap-5">
      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {message}
        </p>
      ) : null}

      <form action={assignAction} className="flex flex-col gap-3">
        <input type="hidden" name="jobId" value={jobId} />
        <Field
          id="job-assignee"
          label="Assigned operator"
          help="Who is producing this job. Only active operators can be assigned."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <select
              id="job-assignee"
              name="operatorId"
              defaultValue={assignedOperatorId ?? ""}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm sm:h-10"
            >
              <option value="">Unassigned</option>
              {operators.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.displayName ?? `Operator (${entry.role})`}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              variant="outline"
              disabled={assigning}
              className="w-full sm:w-auto"
            >
              {assigning ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <UserRound aria-hidden />
              )}
              {assigning ? "Saving…" : "Save assignment"}
            </Button>
          </div>
        </Field>
      </form>

      {nextStates.length ? (
        <form action={moveAction} className="flex flex-col gap-3">
          <input type="hidden" name="jobId" value={jobId} />
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-foreground">
              Move this job
            </legend>
            <p className="text-meta text-muted-foreground">
              Only the moves this job’s state allows are offered. A move to
              customer review is refused unless internal QA is satisfied.
            </p>
            <div className="flex flex-wrap gap-3">
              {nextStates.map((next) => (
                <Button
                  key={next}
                  type="submit"
                  name="next"
                  value={next}
                  variant={next === "customer_review" ? "primary" : "secondary"}
                  disabled={moving}
                  title={jobActionHints[next]}
                >
                  {moving ? (
                    <Loader2 aria-hidden className="animate-spin" />
                  ) : (
                    <PlayCircle aria-hidden />
                  )}
                  {`To ${jobStatusLabels[next].toLowerCase()}`}
                </Button>
              ))}
            </div>
          </fieldset>
        </form>
      ) : (
        <p className="text-meta text-muted-foreground">
          This job has reached the end of its workflow; nothing further can be
          changed.
        </p>
      )}
    </div>
  );
}
