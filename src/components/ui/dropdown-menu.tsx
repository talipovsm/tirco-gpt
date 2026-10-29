"use client";
import { DropdownMenu as DM } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenu = DM.Root;
const DropdownMenuTrigger = DM.Trigger;
const DropdownMenuGroup = DM.Group;

/** Непрозрачное контекстное меню с клавиатурным фокусом и полноценными строками действий. */
function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={sideOffset}
        className={cn(
          "border-border bg-elevated text-foreground shadow-menu text-body data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out z-50 min-w-52 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-xl border p-1.5",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}
function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        "data-[highlighted]:bg-accent data-[highlighted]:text-link [&_svg]:text-muted-foreground data-[highlighted]:[&_svg]:text-link relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return (
    <DM.Label
      className={cn("text-caption text-muted-foreground px-3 pt-2.5 pb-2 font-semibold tracking-wide uppercase", className)}
      {...props}
    />
  );
}
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn("bg-border mx-1.5 my-1.5 h-px", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
