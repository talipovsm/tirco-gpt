"use client";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** Persistent page sections with a strong active underline and horizontal overflow. */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "border-border inline-flex h-12 w-full max-w-full scrollbar-none items-stretch gap-5 overflow-x-auto border-b",
        className,
      )}
      {...props}
    />
  );
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-link text-callout relative -mb-px inline-flex min-w-0 shrink-0 items-center justify-center gap-2 border-b-2 border-transparent px-1 font-semibold whitespace-nowrap transition-[border-color,color] duration-(--duration-standard) disabled:opacity-40 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("data-[state=active]:animate-fade-in pt-6 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
