"use client";

import { Loader2, Save } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialProductionState } from "@/domains/production/state";

import { saveInstructionsAction } from "./actions";
import { INSTRUCTION_FIELDS, type ProductionInstructions } from "./brief";

/**
 * The internal production instructions editor (Phase 4.3, spec §8).
 *
 * Every field is optional and generated from `INSTRUCTION_FIELDS`, so the form
 * and the read view beside it can never disagree about what an operator can
 * record. Clearing a field stores absence rather than an empty string, which is
 * what lets the read view tell the truth instead of rendering blank lines.
 *
 * This is a practical production brief, not a notes platform: ten bounded lines,
 * no threads, no mentions, no attachments (spec §8, §29).
 */
export function ProductionInstructionsForm({
  jobId,
  instructions,
}: {
  jobId: string;
  /** What is already recorded, so the form opens on the operator's own words. */
  instructions: ProductionInstructions;
}) {
  const [state, formAction, pending] = useActionState(
    saveInstructionsAction,
    initialProductionState,
  );

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

      {INSTRUCTION_FIELDS.map((field) => {
        const id = `instruction-${field.key}`;
        const value = instructions[field.key] ?? "";

        return (
          <Field
            key={field.key}
            id={id}
            label={field.label}
            help={field.help}
            optional
          >
            {field.multiline ? (
              <Textarea
                name={field.key}
                rows={3}
                maxLength={field.maxLength}
                defaultValue={value}
                disabled={pending}
                {...fieldAria(id, field.help)}
              />
            ) : (
              <Input
                name={field.key}
                type="text"
                maxLength={field.maxLength}
                defaultValue={value}
                disabled={pending}
                {...fieldAria(id, field.help)}
              />
            )}
          </Field>
        );
      })}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <Save aria-hidden />
        )}
        {pending ? "Saving…" : "Save production instructions"}
      </Button>
    </form>
  );
}
