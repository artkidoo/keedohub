"use client";

import { Check, Loader2, MessageSquare } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceContext } from "@/lib/navigation";
import { submitReview } from "./actions";
import { initialReviewFormState } from "./state";
import { feedbackHelp, reviewChoiceLabels } from "./presentation";

type ReviewActionsProps = {
  context: WorkspaceContext;
  workId: string;
};

/**
 * The customer's two choices on a version of their work: approve it, or ask for
 * changes (spec §13.3 — exactly two actions, and a change request must be in
 * writing).
 *
 * Both choices are always on screen as ordinary forms calling a server action,
 * so the whole review works with JavaScript disabled: no panel to open, no state
 * to lose. The action is chosen by the button, never by a submitted field —
 * there is no way to ask for a state the state machine does not allow.
 */
export function ReviewActions({ context, workId }: ReviewActionsProps) {
  const approve = submitReview.bind(null, context, workId, "approve");
  const requestChanges = submitReview.bind(
    null,
    context,
    workId,
    "request_changes",
  );

  const [approveState, approveAction, approving] = useActionState(
    approve,
    initialReviewFormState,
  );
  const [changesState, changesAction, requesting] = useActionState(
    requestChanges,
    initialReviewFormState,
  );

  const feedbackId = "review-feedback";
  const error = approveState.message ?? changesState.message;
  const approved = approveState.outcome?.status === "approved";
  const changesRequested = changesState.outcome?.status === "changes_requested";

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {approved ? (
        <p className="text-sm text-success-foreground">
          Thank you — you have approved this version. We will let you know here
          when your finished files are ready.
        </p>
      ) : null}

      {changesRequested ? (
        <p className="text-sm text-muted-foreground">
          Thank you — we have your feedback and have started the next round.
        </p>
      ) : null}

      <form action={approveAction}>
        <Button
          type="submit"
          disabled={approving || requesting}
          className="w-full sm:w-auto"
        >
          {approving ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Check aria-hidden />
          )}
          {approving ? "Saving…" : reviewChoiceLabels.approve}
        </Button>
      </form>

      <form action={changesAction} noValidate className="flex flex-col gap-4">
        <Field
          id={feedbackId}
          label="What would you like changed?"
          help={feedbackHelp}
          error={changesState.fieldErrors.feedback}
        >
          <Textarea
            name="feedback"
            rows={5}
            maxLength={4000}
            placeholder="The logo is the right size, but could the background be a little warmer?"
            {...fieldAria(feedbackId, feedbackHelp, changesState.fieldErrors.feedback)}
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          disabled={requesting || approving}
          className="w-full sm:w-auto"
        >
          {requesting ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <MessageSquare aria-hidden />
          )}
          {requesting ? "Sending…" : reviewChoiceLabels.request_changes}
        </Button>
      </form>
    </div>
  );
}
