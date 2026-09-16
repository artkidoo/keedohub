import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityItem } from "@/lib/workspace";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Your workspace activity will appear here — requests, production updates, reviews and deliveries."
      />
    );
  }
  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 border-b border-border py-4 last:border-b-0 last:pb-0 first:pt-0">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-meta text-muted-foreground">{item.description}</p>
            <p className="text-meta text-muted-foreground/70">{item.time}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
