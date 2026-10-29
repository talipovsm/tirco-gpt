import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Status labels use text, semantic color and a subtle boundary. */
const badgeVariants = cva(
  "text-footnote inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "border-success-border bg-success-bg text-success",
        warning: "border-warning-border bg-warning-bg text-warning",
        info: "border-info-border bg-info-bg text-info",
        delayed: "border-delayed-border bg-delayed-bg text-delayed",
        danger: "border-danger-border bg-danger-bg text-danger",
        neutral: "border-neutral-border bg-neutral-bg text-neutral",
        outline: "border-border-strong text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
