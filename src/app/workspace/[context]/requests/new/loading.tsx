import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for the request form — header, then the field card. */
export default function NewRequestLoading() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:gap-10 sm:py-12">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3.5 w-64 max-w-full" />
        <Skeleton className="h-9 w-56 max-w-full sm:h-12 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3.5 w-full max-w-lg" />
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1].map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-28 max-w-full" />
                <Skeleton className="h-11 rounded-lg md:h-10" />
              </div>
            ))}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Skeleton className="h-3.5 w-44 max-w-full" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            {[0, 1].map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-32 max-w-full" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-72 max-w-full" />
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Skeleton className="h-11 w-full rounded-lg sm:h-10 sm:w-28" />
          <Skeleton className="h-11 w-full rounded-lg sm:h-10 sm:w-36" />
        </div>
      </div>
    </Container>
  );
}