"use client";

import { Loader2, PackageCheck } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { deliverWorkAction } from "@/domains/production/actions";
import { initialProductionState } from "@/domains/production/state";

/**
 * The delivery confirmation (Phase 3.2).
 *
 * One action, one consequence, stated in plain words before it is taken: this
 * hands the approved version to the customer and puts the finished file in their
 * Library. It is a real form calling a server action, so it works without
 * JavaScript, and the server re-authorises and re-checks every precondition
 * regardless of what this component believed (spec §19.4).
 */
export function DeliveryButton({
  deliverableId,
  version,
}: {
  deliverableId: string;
  /** The version that will be delivered, named in the button's own label. */
  version: number;
}) {
  const [state, formAction, pending] = useActionState(
    deliverWorkAction,
    initialProductionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="deliverableId" value={deliverableId} />

      {state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <PackageCheck aria-hidden />
        )}
        {pending
          ? "Delivering…"
          : `Deliver version ${version} to the customer`}
      </Button>

      <p className="text-meta text-muted-foreground">
        This is final. Once delivered, this version becomes the customer&rsquo;s
        file and its record cannot be changed.
      </p>
    </form>
  );
}
