import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Centered modal dialog built on Base UI Dialog (focus trap, escape handling,
 * scroll lock and `aria-modal` are provided by the primitive).
 *
 * `title` is required: an unlabelled dialog is not accessible.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogContent({
  title,
  description,
  children,
  className,
  closeLabel = "Close",
  ...props
}: DialogPrimitive.Popup.Props & {
  title: string;
  description?: ReactNode;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-foreground/45 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
      />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "relative flex max-h-[min(90dvh,44rem)] w-full flex-col gap-5 overflow-y-auto rounded-t-2xl border border-border bg-surface-elevated p-6 transition-[opacity,transform] duration-200 ease-out data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-3 data-[ending-style]:opacity-0 sm:w-[min(32rem,100%)] sm:rounded-2xl",
            className,
          )}
          {...props}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <DialogPrimitive.Title className="text-heading font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-meta text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "-mt-1 -mr-1 size-11 shrink-0 md:size-10",
              )}
            >
              <X aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogContent, DialogTrigger };
