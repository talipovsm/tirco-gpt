"use client";
import { Tooltip as T } from "radix-ui";
import * as React from "react";

/** Короткая подпись действия на контрастной поверхности. */
function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <T.Provider delayDuration={350}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={8}
            className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-menu text-footnote data-[state=delayed-open]:animate-fade-in data-[state=closed]:animate-fade-out z-50 max-w-xs rounded-lg border px-3 py-2 leading-relaxed"
          >
            {content}
            <T.Arrow className="fill-sidebar" width={10} height={5} />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

export { Tooltip };
