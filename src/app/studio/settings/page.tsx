import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { canAdministerOperators, requireOperator } from "@/domains/production/access";
import { formatStudioTime } from "@/domains/studio/presentation";
import {
  getStudioOperator,
  getStudioPlatformSummary,
  listOperatorRoster,
} from "@/domains/studio/settings";

export const metadata = { title: "Settings" };

/**
 * Studio settings (Phase 4.1, spec §17).
 *
 * What the Studio knows about itself: who is signed in, what the environment
 * holds, and — for an owner only — the roster of operators. Customer settings
 * live on the customer's own screens; this page does not edit anything there,
 * cannot see any credential, and stores none.
 *
 * The roster is owner-only by construction: a non-owner gets an empty list from
 * the domain function, so the screen shows an honest "not available to you"
 * rather than an error or a hidden section.
 */
export default async function StudioSettingsPage() {
  const access = await requireOperator();

  const [operatorRecord, platform, roster] = await Promise.all([
    getStudioOperator(access),
    getStudioPlatformSummary(access),
    listOperatorRoster(access),
  ]);

  // Permission is read from the session's role, never inferred from whether a
  // list happens to be empty — an empty roster for an owner must say "none yet",
  // not "you may not see this".
  const canSeeRoster = canAdministerOperators(access);

  return (
    <Container className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] sm:py-12">
      <PageHeader
        title="Settings"
        description="This operator, this environment, and (for owners) who else has Studio access."
      />

      <section aria-labelledby="operator" className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="operator">Signed in</CardTitle>
            <CardDescription>
              The operator record behind this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {operatorRecord ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-eyebrow uppercase text-muted-foreground">Name</dt>
                  <dd className="break-words">{operatorRecord.name}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted-foreground">Email</dt>
                  <dd className="break-words">{operatorRecord.email}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted-foreground">Role</dt>
                  <dd className="break-words">
                    <Badge variant="outline">{operatorRecord.role}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted-foreground">
                    Studio label
                  </dt>
                  <dd className="break-words">
                    {operatorRecord.displayName ?? "No label set"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                This session has no active operator record. Reload the page, or
                ask an owner to restore access.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This environment</CardTitle>
            <CardDescription>
              Counts of what exists right now. Not a target, not an estimate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-eyebrow uppercase text-muted-foreground">
                  Customer workspaces
                </dt>
                <dd className="text-heading font-semibold tabular-nums">
                  {platform.workspaces}
                </dd>
              </div>
              <div>
                <dt className="text-eyebrow uppercase text-muted-foreground">
                  Active operators
                </dt>
                <dd className="text-heading font-semibold tabular-nums">
                  {platform.operators}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="roster" className="flex min-w-0 flex-col gap-5">
        <h2 id="roster" className="text-section">
          Operators
        </h2>
        {canSeeRoster && roster.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {roster.map((entry) => (
              <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium break-words">
                    {entry.displayName ?? entry.name}
                  </p>
                  <p className="text-meta break-words text-muted-foreground">
                    {`${entry.email} · added ${formatStudioTime(entry.createdAt)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{entry.role}</Badge>
                  <Badge variant={entry.active ? "success" : "danger"}>
                    {entry.active ? "Active" : "Revoked"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : canSeeRoster ? (
          <EmptyState
            title="No operators yet"
            description="An owner account exists — otherwise this screen could not be open. Further operators will be listed here."
          />
        ) : (
          <EmptyState
            title="Operator access is administered by an owner"
            description="Only an owner can see and manage the full operator roster. Your own access level is shown above."
          />
        )}
      </section>
    </Container>
  );
}
