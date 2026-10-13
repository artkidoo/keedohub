"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  creativeServices,
  serviceEnquiryHref,
  type CreativeService,
} from "@/lib/creative-services";
import { cn } from "@/lib/utils";

/**
 * Creative services grid + "Read more" dialogs (homepage "What we make").
 *
 * The section header stays on the server; only this grid is a client
 * component because the dialogs need interaction. The dialog is the
 * existing Base UI wrapper: focus trap, Escape, scroll lock, required
 * accessible title, visible close control and a scrollable body that stays
 * inside the viewport on both mobile and desktop, in either theme.
 *
 * Content comes from the shared catalogue in `@/lib/creative-services` —
 * no guarantees, prices, testimonials or client names.
 */
export function ServicesGrid() {
  return (
    <ul
      data-slot="services-grid"
      className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
    >
      {creativeServices.map((service) => (
        <li
          key={service.id}
          className="flex flex-col gap-3 bg-surface p-6 transition-colors duration-200 hover:bg-surface-elevated sm:p-7"
        >
          <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-primary">
            <service.icon aria-hidden className="size-5" />
          </span>
          <h3 className="text-heading font-medium">{service.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {service.copy}
          </p>
          <div className="mt-auto pt-3">
            <ServiceDialog service={service} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One service's detail dialog, opened by its card's "Read more" button. */
function ServiceDialog({ service }: { service: CreativeService }) {
  const audienceId = `service-audience-${service.id}`;
  const deliverablesId = `service-deliverables-${service.id}`;

  return (
    <Dialog>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
      >
        Read more<span className="sr-only"> about {service.title}</span>
      </DialogTrigger>
      <DialogContent
        title={service.title}
        description={service.copy}
        className="sm:w-[min(36rem,100%)]"
      >
        <div className="flex min-w-0 flex-col gap-5 [overflow-wrap:anywhere]">
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {service.details}
          </p>

          <section aria-labelledby={audienceId} className="flex flex-col gap-1.5">
            <h3 id={audienceId} className="text-heading font-semibold">
              Who it is for
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {service.audience}
            </p>
          </section>

          <section
            aria-labelledby={deliverablesId}
            className="flex flex-col gap-2"
          >
            <h3 id={deliverablesId} className="text-heading font-semibold">
              What we make
            </h3>
            <ul className="flex flex-col gap-1.5">
              {service.deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href={serviceEnquiryHref(service)}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              Start an enquiry
              <ArrowRight aria-hidden />
            </Link>
            <p className="text-meta text-pretty text-muted-foreground">
              Scope and deliverables are agreed before anything is produced.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}