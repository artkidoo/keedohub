import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  name: string;
  description: string;
  initials: string;
  statusLabel?: string;
  className?: string;
};

export function WorkspaceWelcome({ eyebrow, name, description, initials, statusLabel, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7", className)}>
      <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold tracking-tight text-primary-foreground sm:size-20 sm:text-2xl">
        {initials}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-eyebrow text-primary">{eyebrow}</p>
        <h1 className="text-display text-balance">{name}</h1>
        <p className="max-w-prose text-lead text-pretty text-muted-foreground">{description}</p>
        {statusLabel ? (
          <div className="mt-1"><Badge variant="neutral">{statusLabel}</Badge></div>
        ) : null}
      </div>
    </div>
  );
}
