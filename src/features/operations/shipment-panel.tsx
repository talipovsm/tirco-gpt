"use client";
import { ArrowRight, FileText, MapPinned, MessageSquare, Phone, Truck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatRelative, formatWeight } from "@/lib/format";
import { describePosition } from "@/features/tracking/position-freshness";
import { cn } from "@/lib/utils";
import type { LiveObject } from "@/server/services/operations.service";
import { HealthBadge } from "./health";
import { JourneyTimeline } from "./journey-timeline";

/** Context stays beside the working queue; the full order remains one primary action away. */
export function ShipmentDetailPanel({
  object: o,
  now,
  onClose,
  className,
}: {
  object: LiveObject;
  now: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = new Date(now);
  const position = describePosition(o.position, ref);
  return (
    <section className={cn("flex h-full min-h-0 flex-col", className)} aria-labelledby={`panel-${o.id}`} data-testid="shipment-panel">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="id-code text-muted-foreground text-[11px] font-medium">{o.publicNumber}</span>
              <HealthBadge health={o.health} className="text-[10px]" />
            </div>
            <h2 id={`panel-${o.id}`} className="mt-2.5 text-lg leading-snug font-semibold tracking-[-.035em]">
              {o.origin} <ArrowRight className="text-muted-foreground mx-1 inline size-4" aria-hidden /> {o.destination}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-xs">
              {o.statusLabel} · {formatRelative(o.statusChangedAt, ref)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-muted text-muted-foreground hover:text-foreground grid size-11 shrink-0 place-items-center rounded-lg transition-colors"
            aria-label="Закрыть панель"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="space-y-5 px-5 pb-5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-muted/60 border-border rounded-xl border p-3">
              <p className="text-muted-foreground text-[10px]">Плановая доставка</p>
              <p className={cn("num mt-1 text-[13px] font-semibold", o.health === "delayed" && "text-delayed")}>
                {formatDate(o.deliveryDate)}
              </p>
            </div>
            <div
              className="bg-muted/60 border-border min-w-0 rounded-xl border p-3"
              title={position.description}
              data-position-source={position.source}
            >
              <p className="text-muted-foreground text-[10px]">Позиция</p>
              <p className="mt-1 text-[12px] leading-snug font-medium">{position.label}</p>
            </div>
          </div>
          {o.progress > 0 && (
            <div>
              <div className="mb-2 flex justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">Пройдено по этапам рейса</span>
                <span className="num font-semibold">{Math.round(o.progress * 100)}%</span>
              </div>
              <Progress
                value={o.progress * 100}
                label="Пройдено по рейсу"
                className={cn("h-1.5", o.health === "delayed" && "[&>div]:bg-delayed")}
              />
            </div>
          )}
          <div className="border-border divide-border divide-y rounded-xl border">
            <div className="flex items-center gap-3 p-3.5">
              <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                <Truck className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px]">Автомобиль</p>
                <p className="mt-0.5 text-xs font-medium">
                  {o.vehicle ? (
                    <>
                      <span className="id-code">{o.vehicle.plateNumber}</span>
                      <span className="text-muted-foreground ml-2">
                        {o.vehicle.make} {o.vehicle.model}
                      </span>
                    </>
                  ) : (
                    "Не назначен"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5">
              <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-lg">
                <UserRound className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px]">Водитель</p>
                <p className="mt-0.5 text-xs font-medium">{o.driver?.fullName ?? "Не назначен"}</p>
              </div>
              {o.driver?.phone && (
                <a
                  href={`tel:${o.driver.phone.replace(/\s/g, "")}`}
                  className="text-link bg-primary/8 grid size-11 shrink-0 place-items-center rounded-lg"
                  aria-label={`Позвонить водителю ${o.driver.fullName}`}
                >
                  <Phone className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
          <section>
            <h3 className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[.08em] uppercase">Движение по рейсу</h3>
            <JourneyTimeline status={o.status} stops={o.stops} compact />
          </section>
          <dl className="border-border space-y-3 border-t pt-4 text-xs">
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <dt className="text-muted-foreground">Перевозчик</dt>
              <dd className="text-right font-medium">{o.carrier.legalName}</dd>
            </div>
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <dt className="text-muted-foreground">Заказчик</dt>
              <dd className="text-right font-medium">{o.shipper.legalName}</dd>
            </div>
            <div className="grid grid-cols-[6rem_1fr] gap-3">
              <dt className="text-muted-foreground">Груз</dt>
              <dd className="text-right">
                {o.title}
                {o.weightKg ? <> · {formatWeight(o.weightKg)}</> : null}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="border-border bg-card shrink-0 space-y-2.5 border-t p-4">
        <Button asChild data-testid="panel-open-order" className="w-full">
          <Link href={`/orders/${o.id}`}>
            Открыть перевозку <ArrowRight className="size-4" />
          </Link>
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="secondary" size="sm" className="min-h-11 min-w-0 px-1 text-[11px]">
            <Link href={`/orders/${o.id}?tab=route`}>
              <MapPinned className="size-3.5" /> Маршрут
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="min-h-11 min-w-0 px-1 text-[11px]">
            <Link href={`/orders/${o.id}?tab=documents`}>
              <FileText className="size-3.5" /> Документы
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="min-h-11 min-w-0 px-1 text-[11px]">
            <Link href={`/orders/${o.id}?tab=chat`}>
              <MessageSquare className="size-3.5" /> Чат
            </Link>
          </Button>
        </div>
      </footer>
    </section>
  );
}
