"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { startWorkFromRequestAction } from "@/domains/production/actions";

/** One request, with the action that opens production for it. */
export function IntakeRow({
  requestId,
  title,
  meta,
}: {
  requestId: string;
  title: string;
  meta: string;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium break-words text-foreground">{title}</p>
        <p className="text-meta break-words text-muted-foreground">{meta}</p>
      </div>
      <form action={startWorkFromRequestAction} className="shrink-0">
        <input type="hidden" name="requestId" value={requestId} />
        <StartWorkButton />
      </form>
    </li>
  );
}

/** Submit button that reflects its own pending state, for no-JS parity. */
function StartWorkButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Opening…" : "Start work"}
    </Button>
  );
}
