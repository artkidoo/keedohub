"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { cn } from "@/lib/utils";
import { initialProductionState } from "@/domains/production/state";

import { toggleChecklistAction } from "./actions";
import type { ChecklistItem, ChecklistProgress } from "./checklist";

/**
 * The production checklist (Phase 4.3, spec §9).
 *
 * A short list of things an operator wants to be sure of before releasing work —
 * nothing more. Ticking an item does NOT move the job: internal QA remains the
 * only gate (spec §17). The wording says so, so nobody mistakes a full checklist
 * for permission to ship.
 *
 * Each item is its own form, which is what makes the whole thing work without
 * client state: the browser posts one key and its new value, the server checks
 * that the key belongs to this job's production type, and the page re-renders
 * from the stored result. The checkbox presentation is a real, focusable button
 * with `aria-pressed`, so it is operable and announced correctly with a keyboard
 * or a screen reader.
 */
export function ProductionChecklist({
  jobId,
  progress,
}: {
  jobId: string;
  progress: ChecklistProgress;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-meta text-muted-foreground">
        {progress.totalCount
          ? `${progress.checkedCount} of ${progress.totalCount} checked. A complete checklist does not release work — internal QA does.`
          : "No checklist items apply to this production type."}
      </p>

      {progress.items.length ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {progress.items.map((item) => (
            <li key={item.key}>
              <ChecklistRow jobId={jobId} item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChecklistRow({
  jobId,
  item,
}: {
  jobId: string;
  item: ChecklistItem & { checked: boolean };
}) {
  const [state, formAction, pending] = useActionState(
    toggleChecklistAction,
    initialProductionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="key" value={item.key} />
      <input type="hidden" name="checked" value={item.checked ? "" : "on"} />

      <button
        type="submit"
        disabled={pending}
        aria-pressed={item.checked}
        className={cn(
          "flex min-h-11 w-full items-start gap-3 py-3 text-left transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          pending ? "opacity-60" : "hover:text-primary",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
            item.checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface-elevated",
          )}
        >
          {item.checked ? <Check className="size-3.5" /> : null}
        </span>
        <span
          className={cn(
            "text-sm leading-relaxed",
            item.checked
              ? "text-muted-foreground line-through"
              : "text-foreground",
          )}
        >
          {item.label}
        </span>
        <span className="sr-only">
          {item.checked
            ? "Checked. Select to clear this item."
            : "Not checked. Select to mark this item done."}
        </span>
        {pending ? <Loader2 aria-hidden className="mt-0.5 size-4 animate-spin text-muted-foreground" /> : null}
      </button>

      {state.message ? (
        <p role="alert" className="pb-2 text-meta text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
