/**
 * The creative brief, as the operator works from it (Phase 4.3, spec §7).
 *
 * Everything here is a fact that already exists: the customer's own words, the
 * structured requirements they submitted, the reference links they gave, and the
 * shape of the work. Where something was never supplied the card says so plainly
 * — "No audience information supplied." — rather than filling the gap with
 * plausible creative direction. An operator must be able to trust that anything
 * written here came from the customer (spec §7).
 */

import { FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { CreativeReference, RequirementFact } from "./brief";

/** One label/value line in the brief. */
function BriefFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-eyebrow uppercase text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line text-foreground">{value}</dd>
    </div>
  );
}

/** An honest statement that a piece of direction was never supplied. */
function NotSupplied({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function CreativeBriefCard({
  request,
  productionTypeLabel,
  contextLabel,
  requirements,
  references,
  requestedDate,
  projectName,
}: {
  /** The originating request in the customer's own words, when there is one. */
  request: { title: string; description: string | null; category: string } | null;
  productionTypeLabel: string;
  /** "Brand" or "Artist", for the context line. */
  contextLabel: string;
  /** The customer's structured requirements, present-only. */
  requirements: RequirementFact[];
  /** The customer's reference links, present-only. */
  references: CreativeReference[];
  requestedDate: string | null;
  projectName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What the customer wants</CardTitle>
        <CardDescription>
          Taken from the request they submitted and the profile behind it. Nothing
          here is written by KeedoHub.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <BriefFact label="Production type" value={productionTypeLabel} />
          <BriefFact label="Context" value={contextLabel} />
          <BriefFact label="Project" value={projectName} />
          <BriefFact
            label="Requested by the customer for"
            value={requestedDate ?? "No date was requested."}
          />
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">The request</h3>
          {request ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium break-words text-foreground">
                {request.title}
              </p>
              <p className="text-sm break-words whitespace-pre-line text-muted-foreground">
                {request.description ?? "The customer gave no description for this request."}
              </p>
              <p className="text-meta text-muted-foreground">
                {`They filed it as: ${request.category}`}
              </p>
            </div>
          ) : (
            <NotSupplied>
              This job was not created from a customer request, so there are no
              customer words to work from. Record the requirements in the
              production instructions.
            </NotSupplied>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Requirements they specified
          </h3>
          {requirements.length ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {requirements.map((fact) => (
                <BriefFact key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </dl>
          ) : (
            <NotSupplied>
              No sizes, formats or output requirements were supplied with the request.
            </NotSupplied>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">References they gave</h3>
          {references.length ? (
            <ul className="flex flex-col gap-2">
              {references.map((reference) => (
                <li key={reference.text} className="text-sm break-words text-foreground">
                  {reference.href ? (
                    <a
                      href={reference.href}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="underline decoration-border underline-offset-4 hover:text-primary"
                    >
                      {reference.text}
                    </a>
                  ) : (
                    reference.text
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <NotSupplied>No reference links were supplied with the request.</NotSupplied>
          )}
        </div>

        <p className="flex items-start gap-2 text-meta text-muted-foreground">
          <FileText aria-hidden className="mt-0.5 size-4 shrink-0" />
          The customer&rsquo;s visual direction, colours and typography live in the
          context panel below. Anything not shown there was never supplied.
        </p>
      </CardContent>
    </Card>
  );
}
