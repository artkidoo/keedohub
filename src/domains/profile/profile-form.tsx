"use client";

import { CircleCheck, Loader2, Save } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceContext } from "@/lib/navigation";
import { saveArtistProfile, saveBrandProfile } from "./actions";
import { profileGroupsFor, type ProfileFieldDef } from "./fields";
import { initialProfileFormState } from "./state";

type ProfileFormProps = {
  /** Which experience of the one workspace is being edited (spec §5). */
  context: WorkspaceContext;
  /** Customer-facing label of that context, e.g. "Brand". */
  contextLabel: string;
  /** The profile row this form writes to, inside the caller's workspace. */
  profileId: string;
  /** Stored values, keyed by field name. */
  values: Record<string, string>;
};

const HEX_COLOUR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The colour to show behind a hex value, or nothing when it is not a hex. */
function swatchColour(value: string): string | undefined {
  const trimmed = value.trim();
  return HEX_COLOUR.test(trimmed) ? trimmed : undefined;
}

/**
 * A hex colour field with a live swatch, so the customer sees the colour they
 * are describing rather than only its code.
 */
function ColourControl({
  name,
  defaultValue,
  aria,
}: {
  name: string;
  defaultValue: string;
  aria: ReturnType<typeof fieldAria>;
}) {
  const [value, setValue] = useState(defaultValue);
  const swatch = swatchColour(value);

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="size-11 shrink-0 rounded-lg border border-border md:size-10"
        style={swatch ? { backgroundColor: swatch } : undefined}
      />
      <Input
        name={name}
        value={value}
        onValueChange={(next) => setValue(next)}
        placeholder="#C0392B"
        maxLength={32}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...aria}
      />
    </div>
  );
}

/**
 * The one profile editor, used by both contexts.
 *
 * Brand and Artist share this component: only the field groups and the save
 * action differ, so the two experiences cannot drift apart (spec §5).
 */
export function ProfileForm({
  context,
  contextLabel,
  profileId,
  values,
}: ProfileFormProps) {
  const groups = profileGroupsFor(context);
  const [state, formAction, isPending] = useActionState(
    context === "brand" ? saveBrandProfile : saveArtistProfile,
    initialProfileFormState,
  );

  /**
   * What a field shows: the entries from the last submission (so nothing is
   * lost when validation fails), otherwise what is stored.
   */
  function currentValue(name: string): string {
    return state.values[name] ?? values[name] ?? "";
  }

  function renderField(field: ProfileFieldDef): ReactNode {
    const id = `profile-${field.name.replace(/\./g, "-")}`;
    const error = state.fieldErrors[field.name];
    const aria = fieldAria(id, field.help, error);
    const defaultValue = currentValue(field.name);

    let control: ReactNode;

    switch (field.kind) {
      case "textarea":
        control = (
          <Textarea
            name={field.name}
            defaultValue={defaultValue}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            {...aria}
          />
        );
        break;
      case "color":
        control = (
          <ColourControl
            name={field.name}
            defaultValue={defaultValue}
            aria={aria}
          />
        );
        break;
      default:
        control = (
          <Input
            type={
              field.kind === "email" || field.kind === "tel"
                ? field.kind
                : "text"
            }
            inputMode={field.kind === "url" ? "url" : undefined}
            autoComplete={field.autoComplete}
            name={field.name}
            defaultValue={defaultValue}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            {...aria}
          />
        );
        break;
    }

    return (
      <Field
        key={field.name}
        id={id}
        label={field.label}
        help={field.help}
        error={error}
        optional
        className={field.kind === "textarea" ? "sm:col-span-2" : undefined}
      >
        {control}
      </Field>
    );
  }

  return (
    <form
      key={state.status === "saved" && state.savedAt ? state.savedAt : "draft"}
      action={formAction}
      noValidate
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="profileId" value={profileId} />

      <div className="sticky top-14 z-30 -mx-5 flex flex-col gap-3 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-md sm:-mx-7 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:-mx-10 lg:px-10">
        <p className="text-meta text-muted-foreground">
          Every field is optional. Save whenever you like — nothing is lost.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {state.status === "saved" && state.message ? (
            <p
              role="status"
              className="flex items-center gap-1.5 text-meta font-medium text-success"
            >
              <CircleCheck aria-hidden className="size-4" />
              {state.message}
            </p>
          ) : null}
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Save aria-hidden />
            )}
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="sr-only">
                {`${group.title} — ${contextLabel} profile`}
              </legend>
              {group.fields.map(renderField)}
            </fieldset>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-meta text-muted-foreground">
          {`These details are stored on your ${contextLabel} profile and reused for every piece of work KeedoHub produces for you.`}
        </p>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}