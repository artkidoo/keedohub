"use client";

import { Loader2, PackagePlus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createDeliverableAction } from "@/domains/production/actions";
import { initialProductionState } from "@/domains/production/state";

/**
 * Record a new deliverable — the piece of work a job produces.
 *
 * Deliberately plain: a name the operator can recognise and a type that says
 * what the file will be. There is no creative control here and none is planned
 * for customers; production complexity stays inside KeedoHub.
 *
 * Since Phase 4.3 the type may be pre-filled from the job's production type, so
 * an operator producing cover artwork does not have to remember the vocabulary
 * — but it is still only a suggestion they can overwrite (spec §14).
 */
export function DeliverableForm({
  jobId,
  suggestedType,
}: {
  jobId: string;
  /** The type a deliverable of this kind of work usually is. Advisory only. */
  suggestedType?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createDeliverableAction,
    initialProductionState,
  );

  const nameId = "deliverable-name";
  const typeId = "deliverable-type";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="jobId" value={jobId} />

      {state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        id={nameId}
        label="Deliverable name"
        help="What the customer will recognise this piece of work as."
        error={state.fieldErrors.name}
      >
        <Input
          name="name"
          maxLength={160}
          placeholder="Album cover artwork"
          {...fieldAria(nameId, undefined, state.fieldErrors.name)}
        />
      </Field>

      <Field
        id={typeId}
        label="Format and purpose"
        help="For example: cover_artwork, social_kit, pdf, presentation."
        error={state.fieldErrors.type}
      >
        <Input
          name="type"
          maxLength={80}
          placeholder="cover_artwork"
          defaultValue={suggestedType ?? ""}
          {...fieldAria(typeId, undefined, state.fieldErrors.type)}
        />
      </Field>

      {suggestedType ? (
        <p className="text-meta text-muted-foreground">
          {`Suggested from this job's production type: ${suggestedType}. Change it if the work is something else.`}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <PackagePlus aria-hidden />
        )}
        {pending ? "Saving…" : "Add deliverable"}
      </Button>
    </form>
  );
}
