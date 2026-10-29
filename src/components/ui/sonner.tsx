"use client";
import { Toaster as Sonner } from "sonner";

/** Результат действия остаётся читаемым поверх рабочей области и не забирает клавиатурный фокус. */
export function Toaster() {
  return (
    <Sonner
      theme="system"
      position="top-right"
      closeButton
      visibleToasts={3}
      offset={20}
      mobileOffset={12}
      gap={10}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "!bg-elevated !shadow-menu !text-foreground !font-sans !text-body !rounded-xl !border !border-border !px-4 !py-4 !gap-3 !items-start",
          title: "!font-semibold",
          description: "!text-subheadline !text-muted-foreground",
          icon: "!mt-px",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
          closeButton: "!bg-card !text-muted-foreground !border !border-border !shadow-sm",
        },
      }}
    />
  );
}
