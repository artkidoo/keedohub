import type { ComponentProps, ComponentType } from "react";

import type { Badge } from "@/components/ui/badge";
import type { DeliverableStatus } from "@/lib/db/schema";

/**
 * Presentation extras for output screens (Checkpoint 2.5).
 *
 * Labels and the customer status vocabulary stay in
 * `@/domains/production/status`; only UI-shaped decisions live here.
 */

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

/** Icon type accepted by output empty states (a Lucide component). */
export type OutputIcon = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

/**
 * Badge tone per deliverable status. `in_production` and `internal_qa` are
 * never customer-visible (the queries exclude them) but are mapped so the
 * record is complete and a future surface cannot crash on an unmapped value.
 * Warning is reserved for the one state that needs the customer.
 */
export const deliverableStatusBadgeVariants: Record<
  DeliverableStatus,
  BadgeVariant
> = {
  in_production: "neutral",
  internal_qa: "neutral",
  customer_review: "warning",
  changes_requested: "neutral",
  approved: "success",
  delivered: "success",
};
