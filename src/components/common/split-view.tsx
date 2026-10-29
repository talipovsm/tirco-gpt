"use client";
import { ChevronLeft } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** A working list and a bounded map/context panel; on mobile every panel remains reachable. */
export function SplitView({
  list,
  map,
  mapHeader,
  detail,
  hasDetail,
  onBack,
  backLabel,
  listLabel,
  testId,
}: {
  list: React.ReactNode;
  map: React.ReactNode;
  mapHeader?: React.ReactNode;
  detail?: React.ReactNode;
  hasDetail: boolean;
  onBack: () => void;
  backLabel: string;
  listLabel: string;
  testId?: string;
}) {
  return (
    <div
      className="relative flex min-h-0 flex-col gap-5 lg:grid lg:h-full lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)]"
      data-testid={testId}
    >
      <section
        aria-label={listLabel}
        className={cn(
          "bg-card border-border flex max-h-[38rem] min-h-[22rem] min-w-0 flex-col overflow-hidden rounded-2xl border shadow-[0_2px_8px_rgba(20,35,60,.025)] lg:max-h-none lg:min-h-0",
          hasDetail && "max-lg:hidden",
        )}
      >
        {list}
      </section>
      <aside
        aria-label="Карта и детали"
        className={cn(
          "bg-card border-border flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border shadow-[0_2px_8px_rgba(20,35,60,.025)]",
          hasDetail ? "max-lg:h-[min(52rem,95dvh)] max-lg:min-h-[40rem]" : "max-lg:h-80",
        )}
      >
        {mapHeader && <div className="border-border shrink-0 border-b px-5 py-4">{mapHeader}</div>}
        <div className={cn("relative min-h-0 shrink-0", hasDetail ? "h-44 lg:h-[30%] lg:max-h-56 lg:min-h-36" : "flex-1")}>
          {map}
          {hasDetail && (
            <button
              type="button"
              onClick={onBack}
              className="bg-card text-foreground border-border absolute top-3 left-3 z-[3] inline-flex h-9 items-center gap-1 rounded-lg border pr-3.5 pl-2 text-sm font-medium shadow-sm lg:hidden"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {backLabel}
            </button>
          )}
        </div>
        {hasDetail && <div className="animate-fade-in border-border min-h-0 flex-1 border-t">{detail}</div>}
      </aside>
    </div>
  );
}
