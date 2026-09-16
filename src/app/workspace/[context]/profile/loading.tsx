import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the profile editor. Mirrors the real layout — header,
 * action bar, and the field groups — so nothing shifts when the profile
 * arrives (spec §23.2).
 */
export default function WorkspaceProfileLoading() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:gap-10 sm:py-12">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3.5 w-48 max-w-full" />
        <Skeleton className="h-9 w-56 max-w-full sm:h-12 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-11 w-full rounded-lg sm:h-10 sm:w-36" />
      </div>

      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6"
        >
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-3.5 w-full max-w-sm" />
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-28 max-w-full" />
                <Skeleton className="h-11 rounded-lg md:h-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Container>
  );
}