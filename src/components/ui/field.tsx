import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  /** Id shared by the label, the control and the messages below it. */
  id: string;
  label: string;
  /** One line of guidance, shown under the label. */
  help?: string;
  /** Validation message. Its presence also marks the control as invalid. */
  error?: string;
  /** Marks the field as optional, which every profile field is. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * One labelled form field: label, optional guidance, the control, and the
 * validation message in its place. Styling comes from the shared design
 * tokens, so a field looks the same anywhere in KeedoHub.
 */
function Field({
  id,
  label,
  help,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {optional ? (
          <span className="text-eyebrow text-muted-foreground uppercase">
            Optional
          </span>
        ) : null}
      </div>
      {help ? (
        <p id={`${id}-help`} className="text-meta leading-relaxed text-muted-foreground">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The accessible wiring a control needs to belong to a `Field`: the id its
 * label points at, whether it is currently invalid, and the ids of the text
 * that describes it.
 */
function fieldAria(id: string, help?: string, error?: string) {
  const describedBy = [
    help ? `${id}-help` : null,
    error ? `${id}-error` : null,
  ].filter((value): value is string => value !== null);

  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
  };
}

export { Field, fieldAria };