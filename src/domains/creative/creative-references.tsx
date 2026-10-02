/**
 * Reference material for the work (Phase 4.3, spec §13).
 *
 * Reference *files* the customer supplied are read from the existing asset table
 * (`category = 'reference'`) and shown with the same preview the rest of the
 * workspace uses. Reference *links* and the profile's written references are
 * shown by the brief and context panels, so nothing is repeated here.
 *
 * This is an operator aid, not a tool: there is no upload, no reordering, no
 * editing and no customer-facing surface. If the customer supplied nothing, the
 * card says so and points the operator at the brief instead (spec §7).
 */

import { Images } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { ProductionFilePreview } from "./production-file-preview";
import type { ProductionReference } from "./references";

export function CreativeReferencesCard({
  references,
}: {
  references: ProductionReference[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creative references</CardTitle>
        <CardDescription>
          Files the customer supplied with this work. KeedoHub does not add
          references of its own.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {references.length ? (
          <ul className="grid gap-6 sm:grid-cols-2">
            {references.map((reference) => (
              <li key={reference.id} className="min-w-0">
                <ProductionFilePreview
                  asset={{
                    id: reference.id,
                    filename: reference.filename,
                    mimeType: reference.mimeType,
                    sizeBytes: reference.sizeBytes,
                    createdAt: reference.createdAt,
                  }}
                  caption="Customer reference"
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Images}
            title="No reference files were supplied"
            description="This job has no reference material attached from the customer. Work from the brief, the request and the context above."
          />
        )}
      </CardContent>
    </Card>
  );
}
