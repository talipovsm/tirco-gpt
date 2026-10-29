"use client";
import { ArrowRight, ChevronRight, Clock3, Truck, UserRound } from "lucide-react";
import * as React from "react";
import { formatShortDate } from "@/lib/format";
import { describePosition } from "@/features/tracking/position-freshness";
import { cn } from "@/lib/utils";
import type { LiveObject } from "@/server/services/operations.service";
import { HealthDot } from "./health";

/** Planned loading/delivery, never a predicted arrival invented by the UI. */
export function etaLabel(o: Pick<LiveObject, "health" | "deliveryDate" | "loadingDate" | "progress">) {
  if (o.health === "done") return "доставлено";
  if (o.progress > 0 || o.health === "delayed" || o.health === "arriving")
    return o.deliveryDate ? `до ${formatShortDate(o.deliveryDate)}` : "—";
  return o.loadingDate ? `загр. ${formatShortDate(o.loadingDate)}` : "—";
}

/** Shipment cards keep the route, current work and assigned resources readable at a glance. */
export function ShipmentList({
  objects,
  selectedId,
  onSelect,
  now,
  className,
}: {
  objects: LiveObject[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  now: string;
  className?: string;
}) {
  const ref = new Date(now);
  return (
    <ul className={cn("space-y-2.5 p-3.5 pt-1 sm:p-4 sm:pt-1", className)} data-testid="shipment-list">
      {objects.map((o) => {
        const selected = o.id === selectedId;
        const position = describePosition(o.position, ref);
        return (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onSelect(o.id)}
              aria-pressed={selected}
              data-testid="shipment-row"
              className={cn(
                "group relative block w-full rounded-xl border p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-200 sm:p-4",
                selected
                  ? "border-primary bg-primary/[.045] shadow-[inset_3px_0_0_var(--primary)]"
                  : "border-border bg-card hover:border-primary/35 hover:bg-muted/35",
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-muted-foreground id-code text-[11px] font-medium">{o.publicNumber}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium">
                  <HealthDot health={o.health} live={selected} className="size-1.5" />
                  <span className="truncate">{o.statusLabel}</span>
                </span>
              </span>
              <span className="mt-3 flex items-center gap-2.5">
                <span className="min-w-0 flex-1 text-[15px] leading-snug font-semibold tracking-[-.025em] sm:text-base">
                  {o.origin} <ArrowRight className="text-muted-foreground mx-1 inline size-3.5" aria-hidden /> {o.destination}
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    selected ? "text-link" : "text-muted-foreground group-hover:translate-x-0.5",
                  )}
                  aria-hidden
                />
              </span>
              <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span className={cn("inline-flex items-center gap-1.5", o.vehicle ? "text-foreground" : "text-muted-foreground")}>
                  <Truck className="text-muted-foreground size-3.5" aria-hidden />
                  <span className="id-code">{o.vehicle?.plateNumber ?? "Машина не назначена"}</span>
                </span>
                <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5">
                  <UserRound className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{o.driver?.fullName ?? "Водитель не назначен"}</span>
                </span>
              </span>
              <span className="border-border mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t pt-2.5 text-[11px]">
                <span
                  className="text-muted-foreground"
                  title={position.description}
                  data-testid="position-freshness"
                  data-position-source={position.source}
                >
                  {position.label}
                </span>
                <span
                  className={cn(
                    "num inline-flex shrink-0 items-center gap-1.5",
                    o.health === "delayed" ? "text-delayed font-medium" : "text-muted-foreground",
                  )}
                >
                  <Clock3 className="size-3" aria-hidden /> {etaLabel(o)}
                </span>
              </span>
              {o.progress > 0 && o.progress < 1 && (
                <span className="bg-muted mt-3 block h-1 overflow-hidden rounded-full" aria-hidden>
                  <span
                    className={cn("block h-full rounded-full", o.health === "delayed" ? "bg-delayed" : "bg-primary")}
                    style={{ width: `${Math.round(o.progress * 100)}%` }}
                  />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
