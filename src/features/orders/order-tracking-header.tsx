import { ArrowRight, MapPin, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { roadKm } from "@/lib/geo/distance";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { ORDER_PHASE_LABELS, type OrderProgress } from "@/lib/state-machine/order-progress";
import { cn } from "@/lib/utils";
import { MapView, type MapLine, type MapPoint } from "@/features/tracking/map-view";

type Stop = { city: string; country: string; latitude: number | null; longitude: number | null };
type Location = { latitude: number | null; longitude: number | null; createdAt: Date | string } | null;

const DAY = 86_400_000;

function daysFromNow(d: Date | string) {
  const target = new Date(d);
  const today = new Date();
  const a = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((a - b) / DAY);
}

/** Ключевой факт рейса с отдельной подписью, значением и пояснением. */
function Fact({
  label,
  value,
  hint,
  tone,
  testId,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "warning";
  testId?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5" data-testid={testId}>
      <dt className="text-footnote text-muted-foreground">{label}</dt>
      <dd className={cn("text-body mt-1 font-semibold break-words", tone === "warning" && "text-warning")}>{value}</dd>
      {hint && <dd className={cn("text-footnote mt-0.5", tone === "warning" ? "text-warning" : "text-muted-foreground")}>{hint}</dd>}
    </div>
  );
}

/**
 * Шапка отслеживания перевозки: где груз, какой этап, когда будет, что дальше.
 * Map + Status + Progress + Key facts — вместо карты, спрятанной во вкладке.
 * ETA не выдумывается: показывается плановая дата доставки и честное предупреждение, если срок прошёл.
 */
export function OrderTrackingHeader({
  progress,
  stops,
  lastLocation,
  loadingDate,
  deliveryDate,
  vehicle,
  driver,
  points,
  lines,
}: {
  progress: OrderProgress;
  stops: Stop[];
  lastLocation: Location;
  loadingDate: Date | string | null;
  deliveryDate: Date | string | null;
  vehicle: { make: string; model: string; plateNumber: string } | null;
  driver: { fullName: string; phone: string } | null;
  points: MapPoint[];
  /** Линия маршрута по дорогам; нет — точки соединяются пунктиром */
  lines?: MapLine[];
}) {
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const current = progress.currentIndex >= 0 ? progress.steps[progress.currentIndex] : null;
  const moving = progress.phase === "LOADING" || progress.phase === "TRANSIT" || progress.phase === "DELIVERY";
  const finished = progress.phase === "DONE" || progress.phase === "CANCELLED";

  const hasPosition = lastLocation?.latitude != null && lastLocation.longitude != null;
  const remainingKm =
    hasPosition && destination?.latitude != null && destination.longitude != null && moving
      ? roadKm({ lat: lastLocation!.latitude!, lng: lastLocation!.longitude! }, { lat: destination.latitude, lng: destination.longitude })
      : null;

  const dueIn = deliveryDate ? daysFromNow(deliveryDate) : null;
  const overdue = dueIn !== null && dueIn < 0 && !finished && progress.steps[progress.currentIndex]?.key !== "delivered";
  const dueHint =
    dueIn === null || finished
      ? null
      : overdue
        ? `плановый срок прошёл ${Math.abs(dueIn)} дн. назад`
        : dueIn === 0
          ? "сегодня"
          : dueIn > 0
            ? `через ${dueIn} дн.`
            : null;

  const percent = progress.percent;
  const showMap = points.length > 0 && !finished;

  return (
    <Card className="gap-0 overflow-hidden py-0" data-testid="order-tracking">
      <div className={cn("grid", showMap && "lg:grid-cols-[minmax(0,1.5fr)_minmax(200px,1fr)]")}>
        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-footnote text-muted-foreground mb-2 font-medium">Ход перевозки</p>
              <p className="text-title3 font-semibold">{current?.label ?? ORDER_PHASE_LABELS[progress.phase]}</p>
              {progress.currentNote && <p className="text-subheadline text-muted-foreground mt-1">{progress.currentNote}</p>}
            </div>
            <span className="bg-accent text-link num shrink-0 rounded-lg px-3 py-2 text-sm font-semibold">{percent}%</span>
          </div>
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <span className="min-w-0">
                <span className="text-footnote text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {origin?.country}
                </span>
                <span className="text-title3 block font-semibold break-words">{origin?.city}</span>
              </span>
              <ArrowRight className="text-muted-foreground size-5" aria-hidden />
              <span className="min-w-0 text-right">
                <span className="text-footnote text-muted-foreground mb-1 block">{destination?.country}</span>
                <span className="text-title3 block font-semibold break-words">{destination?.city}</span>
              </span>
            </div>
            <div
              className="relative mt-5 h-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`Выполнено этапов: ${percent}%`}
            >
              <div className="bg-fill-secondary absolute inset-0 rounded-full" />
              <div
                className={cn(
                  "animate-progress-grow absolute inset-y-0 left-0 origin-left rounded-full",
                  progress.phase === "CANCELLED"
                    ? "bg-neutral"
                    : progress.phase === "PAUSED"
                      ? "bg-danger"
                      : finished
                        ? "bg-success"
                        : "bg-primary",
                )}
                style={{ width: `${percent}%` }}
              />
              {moving && (
                <span
                  className="bg-primary text-primary-foreground ring-card absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg ring-[3px] transition-[left] duration-(--duration-complex)"
                  style={{ left: `${Math.min(Math.max(percent, 3), 97)}%` }}
                  aria-hidden
                >
                  <Truck className="size-4" />
                </span>
              )}
            </div>
            <p className="text-footnote text-muted-foreground num mt-4 leading-relaxed">
              {progress.steps.filter((s) => s.state === "done").length} из {progress.steps.length} этапов
              {progress.nextLabel && !finished && <> · далее: {progress.nextLabel}</>}
            </p>
          </div>
        </div>
        {showMap && (
          <div className="border-border relative min-h-48 border-t lg:border-t-0 lg:border-l">
            <MapView points={points} lines={lines} className="bg-muted h-48 w-full lg:absolute lg:inset-0 lg:h-full" />
          </div>
        )}
      </div>
      <dl className="border-border bg-surface-secondary [&>div]:border-border grid grid-cols-2 border-t xl:grid-cols-4 xl:[&>div+div]:border-l [&>div:nth-child(even)]:border-l max-xl:[&>div:nth-child(n+3)]:border-t">
        <Fact
          label="Последняя позиция"
          testId="tracking-last-position"
          value={hasPosition ? formatRelative(lastLocation!.createdAt) : "нет данных"}
          hint={
            remainingKm !== null
              ? `≈ ${formatNumber(Math.round(remainingKm))} км до ${destination?.city}`
              : hasPosition
                ? undefined
                : "водитель ещё не передавал геопозицию"
          }
        />
        <Fact
          label="Плановая доставка"
          value={deliveryDate ? <span className="num">{formatDate(deliveryDate)}</span> : "не указана"}
          hint={dueHint}
          tone={overdue ? "warning" : undefined}
        />
        <Fact label="Загрузка" value={loadingDate ? <span className="num">{formatDate(loadingDate)}</span> : "не указана"} />
        <Fact
          label="Транспорт"
          value={vehicle ? <span className="id-code">{vehicle.plateNumber}</span> : "не назначен"}
          hint={driver ? driver.fullName : vehicle ? "водитель не назначен" : undefined}
        />
      </dl>
    </Card>
  );
}
