import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Breadcrumb trail. Uses ordered-list semantics and `aria-current` for the
 * final item, so navigation is meaningful without a mouse (spec §12).
 */
function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.href ?? "current"}-${item.label}`}>
              <li className="flex min-w-0 items-center">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="truncate font-medium text-foreground"
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li role="presentation" aria-hidden className="flex items-center">
                  <ChevronRight className="size-3.5 shrink-0" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
