"use client";
import { List, MapPinned } from "lucide-react";
import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 1024px)";
function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const desktopSnapshot = () => window.matchMedia(DESKTOP).matches;
const serverSnapshot = () => true;

/** На телефоне — список или карта; выбор перевозки открывает доступную панель поверх текущего контекста. */
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
  detailTitle = "Детали перевозки",
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
  detailTitle?: string;
}) {
  const desktop = React.useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverSnapshot);
  const [view, setView] = React.useState<"list" | "map">("list");
  const panelClass = "bg-card border-border min-h-0 min-w-0 overflow-hidden rounded-2xl border";
  return (
    <div className="relative flex min-h-0 flex-col gap-3 lg:grid lg:h-full lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.9fr)] lg:gap-5" data-testid={testId}>
      {!desktop && (
        <div className="border-border bg-card grid grid-cols-2 gap-1 rounded-xl border p-1" role="group" aria-label="Вид рабочего пространства">
          {([
            ["list", "Список", List],
            ["map", "Карта", MapPinned],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              data-testid={`workspace-view-${key}`}
              onClick={() => setView(key)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                view === key ? "bg-accent text-link" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}
      <section aria-label={listLabel} className={cn(panelClass, "flex flex-col", !desktop && view !== "list" && "hidden")}>
        {list}
      </section>
      {(desktop || view === "map") && (
        <aside aria-label="Карта и детали" className={cn(panelClass, "flex flex-col", !desktop && "h-[28rem]")}>
          {mapHeader && <div className="border-border shrink-0 border-b px-5 py-4">{mapHeader}</div>}
          <div className={cn("relative min-h-0", desktop && hasDetail ? "h-[30%] max-h-56 min-h-36 shrink-0" : "flex-1")}>
            {map}
          </div>
          {desktop && hasDetail && <div className="border-border min-h-0 flex-1 border-t">{detail}</div>}
        </aside>
      )}
      {!desktop && (
        <Sheet open={hasDetail} onOpenChange={(open) => { if (!open) onBack(); }}>
          <SheetContent side="bottom" className="h-[92dvh] max-h-[92dvh]" data-testid="workspace-detail-sheet">
            <SheetHeader className="shrink-0 pt-2 pb-3">
              <SheetTitle>{detailTitle}</SheetTitle>
              <SheetDescription className="sr-only">{backLabel}. Данные и доступные действия выбранного объекта.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1">{detail}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
