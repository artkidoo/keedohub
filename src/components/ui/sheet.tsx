import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Edge sheet for mobile navigation.
 *
 * Built on Base UI Dialog rather than Drawer on purpose: a panel that slides
 * in from the screen edge and needs no gesture support is a positioned Dialog
 * (see the bundled Base UI Dialog usage guidelines).
 *
 * `label` is required and rendered for screen readers, so the panel always has
 * an accessible name.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;

const sideClasses = {
  start:
    "inset-y-0 left-0 border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  end: "inset-y-0 right-0 border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
} as const;

function SheetContent({
  side = "start",
  label,
  children,
  className,
  ...props
}: DialogPrimitive.Popup.Props & {
  side?: keyof typeof sideClasses;
  label: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 z-50 bg-foreground/45 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex h-full w-[min(20rem,88vw)] flex-col border-border bg-surface-elevated outline-none transition-transform duration-200 ease-out",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">
          {label}
        </DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetCloseButton({
  label = "Close panel",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <DialogPrimitive.Close
      data-slot="sheet-close"
      aria-label={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "size-11 shrink-0 md:size-10",
        className,
      )}
    >
      <X aria-hidden />
    </DialogPrimitive.Close>
  );
}

export { Sheet, SheetCloseButton, SheetContent, SheetTrigger };
