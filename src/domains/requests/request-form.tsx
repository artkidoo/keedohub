"use client";

import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, fieldAria } from "@/components/ui/field";
import { fieldClasses, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceContext } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { createArtistRequest, createBrandRequest } from "./actions";
import { requestCategoriesFor } from "./categories";
import { initialRequestFormState } from "./state";

type RequestFormProps = {
  /** Which experience of the one workspace is sending the request (spec §5). */
  context: WorkspaceContext;
  /** Customer-facing label of that context, e.g. "Brand". */
  contextLabel: string;
};

/**
 * The one request form, used by both contexts.
 *
 * Brand and Artist share this component: only the category list and the
 * submit action differ, so the two experiences cannot drift apart (spec §5).
 * The action is chosen from `context` — never from anything submitted — and
 * the server re-authorises on every submission (spec §19.4).
 */
export function RequestForm({ context, contextLabel }: RequestFormProps) {
  const listPath = `/workspace/${context}/requests`;
  const categories = requestCategoriesFor(context);
  const [state, formAction, isPending] = useActionState(
    context === "brand" ? createBrandRequest : createArtistRequest,
    initialRequestFormState,
  );

  /**
   * What a field shows: the entries from the last submission, so nothing is
   * lost when validation fails.
   */
  function currentValue(name: string): string {
    return state.values[name] ?? "";
  }

  const titleId = "request-title";
  const categoryId = "request-category";
  const descriptionId = "request-description";
  const requirementsId = "request-requirements";
  const linksId = "request-reference-links";

  const titleHelp = `For example: ${context === "brand" ? "Autumn campaign key visual" : "Cover artwork for my single"}.`;
  const descriptionHelp =
    "What you need, and what it is for. A sentence or two in your own words is enough.";
  const requirementsHelp =
    "Sizes, formats, platforms, quantities, language, must-haves — one per line.";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tell us what you need</CardTitle>
          <CardDescription>
            {`Three required answers and two optional ones. Every ${contextLabel} request is reviewed by KeedoHub before any work begins.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id={titleId}
              label="Title"
              help={titleHelp}
              error={state.fieldErrors.title}
            >
              <Input
                name="title"
                defaultValue={currentValue("title")}
                placeholder="Cover artwork for my single"
                maxLength={120}
                {...fieldAria(titleId, titleHelp, state.fieldErrors.title)}
              />
            </Field>

            <Field
              id={categoryId}
              label="What kind of request is this?"
              error={state.fieldErrors.category}
            >
              <select
                name="category"
                defaultValue={currentValue("category")}
                className={cn(fieldClasses, "h-11 md:h-10")}
                {...fieldAria(categoryId, undefined, state.fieldErrors.category)}
              >
                <option value="">Choose a category…</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id={descriptionId}
              label="What would you like made?"
              help={descriptionHelp}
              error={state.fieldErrors.description}
              className="sm:col-span-2"
            >
              <Textarea
                name="description"
                defaultValue={currentValue("description")}
                placeholder="Tell us the outcome you are after, in your words."
                maxLength={4000}
                rows={5}
                {...fieldAria(
                  descriptionId,
                  descriptionHelp,
                  state.fieldErrors.description,
                )}
              />
            </Field>

            <Field
              id={requirementsId}
              label="Requirements"
              help={requirementsHelp}
              error={state.fieldErrors.requirements}
              optional
            >
              <Textarea
                name="requirements"
                defaultValue={currentValue("requirements")}
                placeholder={"1080 × 1080 px\nPNG\nEnglish"}
                maxLength={2000}
                {...fieldAria(
                  requirementsId,
                  requirementsHelp,
                  state.fieldErrors.requirements,
                )}
              />
            </Field>

            <Field
              id={linksId}
              label="Reference links"
              help="Web addresses of examples you like — one per line, up to 10."
              error={state.fieldErrors.referenceLinks}
              optional
            >
              <Textarea
                name="referenceLinks"
                defaultValue={currentValue("referenceLinks")}
                placeholder={
                  "example.com/inspiration\nhttps://example.com/look"
                }
                {...fieldAria(
                  linksId,
                  undefined,
                  state.fieldErrors.referenceLinks,
                )}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-meta text-muted-foreground">
          {`Your request goes to KeedoHub for a first check. You can follow its state any time under My Requests.`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href={listPath}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full sm:w-auto",
            )}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Send aria-hidden />
            )}
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
    </form>
  );
}