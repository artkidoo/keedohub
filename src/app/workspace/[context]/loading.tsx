import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state for a workspace context. Mirrors the page layout so
 * nothing shifts when content arrives, and uses skeletons rather than a
 * spinner (spec §23.2).
 */
export default function WorkspaceContextLoading() {
  return (
    <Container className="flex flex-col gap-8 py-8 sm:py-12">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:pb-8">
        <Skeleton className="h-9 w-56 max-w-full sm:h-12 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="flex flex-col gap-3 bg-background p-5 sm:p-6">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3.5 w-full max-w-xs" />
          </div>
        ))}
      </div>
    </Container>
  );
}