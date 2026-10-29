import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Action hierarchy shared by all workspaces; compact controls remain readable on desktop. */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-body font-semibold transition-[background-color,border-color,color,box-shadow,opacity] duration-(--duration-micro) disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress [&_svg]:size-[1.125em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-control hover:bg-primary-hover active:brightness-90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover active:brightness-90",
        outline: "border-border-strong bg-card text-foreground hover:border-primary/40 hover:bg-accent active:bg-muted",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-secondary-hover active:bg-fill",
        ghost: "text-foreground hover:bg-fill-tertiary active:bg-fill-secondary",
        link: "text-link underline-offset-2 hover:underline",
        success: "bg-success-solid text-white hover:bg-success-solid-hover active:brightness-90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-callout",
        lg: "h-12 px-5 text-headline",
        xl: "h-14 rounded-lg px-6 text-title3 [&_svg]:size-5",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0 lg:h-auto lg:px-0" }],
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
