"use client";

import { Loader2, Upload } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { produceVersionAction } from "@/domains/production/actions";
import { initialProductionState } from "@/domains/production/state";
import { MAX_OUTPUT_MEGABYTES } from "@/domains/production/limits";

/**
 * Produce a new version of a deliverable.
 *
 * The file is the version. Everything the customer will see about it — that it
 * exists, which number it is, what changed — is derived from what is uploaded
 * here and stored server-side; nothing about a version is edited in place, and
 * the previous version is kept (spec §11.3).
 */
export function VersionForm({
  deliverableId,
  nextVersion,
  disabledReason,
}: {
  deliverableId: string;
  /** The number this upload will become, shown so the operator knows what it is. */
  nextVersion: number;
  /** Why producing is unavailable right now, when it is. */
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(
    produceVersionAction,
    initialProductionState,
  );

  const fileId = "version-file";
  const noteId = "version-note";
  const shareId = "version-share";
  const disabled = Boolean(disabledReason) || pending;

  return (
    <form
      action={formAction}
      noValidate
      encType="multipart/form-data"
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="deliverableId" value={deliverableId} />

      {state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        id={fileId}
        label={`File for version ${nextVersion}`}
        help={`The finished file for this version. Up to ${MAX_OUTPUT_MEGABYTES} MB.`}
        error={state.fieldErrors.file}
      >
        <Input
          name="file"
          type="file"
          disabled={disabled}
          {...fieldAria(fileId, undefined, state.fieldErrors.file)}
        />
      </Field>

      <Field
        id={noteId}
        label="What changed in this version"
        help="Internal note. The customer does not see it, but the next operator does."
        optional
      >
        <Textarea
          name="note"
          rows={3}
          maxLength={2000}
          disabled={disabled}
          placeholder="Adjusted the crop and rebalanced the type."
          {...fieldAria(noteId)}
        />
      </Field>

      <div className="flex items-start gap-3">
        <input
          id={shareId}
          name="shareWithCustomer"
          type="checkbox"
          defaultChecked
          disabled={disabled}
          className="mt-1 size-5 accent-primary"
        />
        <label htmlFor={shareId} className="text-sm leading-relaxed text-foreground">
          Share this file with the customer
          <span className="block text-meta text-muted-foreground">
            Unshared files stay internal to KeedoHub and cannot be reviewed by
            the customer.
          </span>
        </label>
      </div>

      <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <Upload aria-hidden />
        )}
        {pending ? "Producing…" : `Produce version ${nextVersion}`}
      </Button>

      {disabledReason ? (
        <p className="text-meta text-muted-foreground">{disabledReason}</p>
      ) : null}
    </form>
  );
}
