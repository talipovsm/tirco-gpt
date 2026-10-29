"use client";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

/** Панель задачи поверх рабочего пространства; сторона выбирается по контексту экрана. */
function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "bottom" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="bg-overlay data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out fixed inset-0 z-50 backdrop-blur-[3px]" />
      <SheetPrimitive.Content
        className={cn(
          "border-border bg-elevated text-foreground shadow-dialog fixed z-50 flex flex-col will-change-transform outline-none",
          side === "right" &&
            "data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right inset-y-0 right-0 h-full w-full max-w-lg border-l pt-[env(safe-area-inset-top)]",
          side === "left" &&
            "data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left inset-y-0 left-0 h-full w-[20rem] max-w-[88vw] border-r pt-[env(safe-area-inset-top)]",
          side === "bottom" &&
            "data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t pt-3 pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        {...props}
      >
        {side === "bottom" && <div aria-hidden className="bg-border-strong mx-auto mb-2 h-1 w-10 shrink-0 rounded-full" />}
        {children}
        <SheetPrimitive.Close
          className={cn(
            "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 grid size-10 place-items-center rounded-lg border transition-colors duration-(--duration-micro)",
            side === "bottom" ? "top-4" : "top-[calc(env(safe-area-inset-top)+0.875rem)]",
          )}
          aria-label="Закрыть"
        >
          <X className="size-4" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-border flex flex-col gap-2 border-b px-6 pt-6 pr-16 pb-5", className)} {...props} />;
}
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-title2", className)} {...props} />;
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-muted-foreground text-body leading-relaxed", className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger };
