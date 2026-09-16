import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

/** Shared field styling so `input` and `textarea` remain visually identical. */
const fieldClasses =
  "w-full rounded-lg border border-input bg-surface-elevated px-3.5 text-sm text-foreground placeholder:text-muted-foreground/75 transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/20";

/**
 * Text input. Always pair with a `<label>` (or `Field`) so the control has an
 * accessible name — Base UI inherits native semantics but no label.
 */
function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-11 md:h-10 has-[input]:h-auto",
        className,
      )}
      {...props}
    />
  );
}

export { Input, fieldClasses };
