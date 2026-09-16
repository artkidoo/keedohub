import type { ComponentProps } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Multi-line text input. Shares field styling with `Input` so forms stay
 * consistent. Always pair with a `<label>`.
 */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClasses,
        "min-h-28 resize-y py-3 leading-relaxed field-sizing-content",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
