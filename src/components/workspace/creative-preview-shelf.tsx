import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PreviewSpec } from "@/lib/workspace";

export function CreativePreviewShelf({ previews, emptyTitle, emptyCopy }: { previews: PreviewSpec[]; emptyTitle: string; emptyCopy: string }) {
  return (
    <div data-slot="creative-shelf">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {previews.map((preview) => (
          <li key={preview.id} className="flex min-w-0 flex-col gap-2.5">
            <div
              aria-hidden
              className={cn(
                "relative flex items-center justify-center overflow-hidden rounded-2xl border border-border",
                "bg-[linear-gradient(135deg,var(--kh-primary-soft),var(--kh-muted)_70%)]",
                preview.aspect,
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-elevated/80 font-heading text-lg font-semibold text-primary backdrop-blur-sm">
                {preview.title.charAt(0)}
              </span>
              <span className="absolute top-3 left-3">
                <Badge variant="neutral">{preview.kind}</Badge>
              </span>
              <span className="absolute right-3 bottom-3 rounded-full bg-surface-elevated/80 px-2.5 py-1 text-meta text-muted-foreground backdrop-blur-sm">
                Preview style
              </span>
            </div>
            <p className="truncate text-sm font-medium">{preview.title}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">{emptyTitle} </strong>
        {emptyCopy}
      </p>
    </div>
  );
}
