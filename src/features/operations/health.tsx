import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
  PauseCircle,
  Timer,
  Ban,
  Layers3,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HEALTH_META, type Health } from "@/lib/operations";
import { cn } from "@/lib/utils";

const ICONS: Record<Health, LucideIcon> = {
  moving: Navigation,
  arriving: Timer,
  delayed: AlertTriangle,
  waiting: Clock,
  attention: PauseCircle,
  done: CheckCircle2,
  cancelled: Ban,
};

/** Цвета точек — те же переменные темы, что и у маркеров карты (globals.css, --map-*). */
const DOT: Record<Health, string> = {
  moving: "bg-[var(--map-moving)] text-[var(--map-moving)]",
  arriving: "bg-[var(--map-arriving)] text-[var(--map-arriving)]",
  delayed: "bg-[var(--map-delayed)]",
  waiting: "bg-[var(--map-waiting)]",
  attention: "bg-[var(--map-attention)]",
  done: "bg-[var(--map-done)]",
  cancelled: "bg-[var(--map-cancelled)]",
};

/** Точка состояния объекта (в списках, рядом с маршрутом). Не единственный носитель смысла — рядом всегда текст. */
export function HealthDot({ health, live, className }: { health: Health; live?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        DOT[health],
        live && (health === "moving" || health === "arriving") && "animate-live-pulse",
        className,
      )}
    />
  );
}

/** Операционное состояние: «В движении», «Опаздывает», «Ожидание»… — тонированная капсула. */
export function HealthBadge({ health, className }: { health: Health; className?: string }) {
  const meta = HEALTH_META[health];
  const Icon = ICONS[health];
  return (
    <Badge tone={meta.tone} className={cn("h-6 rounded-full px-2", className)} data-health={health}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}

/**
 * Сегмент сводки: число и подпись. С onClick — фильтр (aria-pressed), выбранный — с белым бегунком.
 */
export function OperationalMetric({
  label,
  value,
  health,
  active,
  onClick,
  testId,
}: {
  label: string;
  value: number;
  health?: Health;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const Icon = health ? ICONS[health] : Layers3;
  const content = (
    <>
      <span className="hidden w-full items-start justify-between gap-2 sm:flex">
        <span className={cn("grid size-9 place-items-center rounded-xl", active ? "bg-black/5" : "bg-muted text-muted-foreground")}>
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        {onClick && <ArrowUpRight className={cn("mt-1 size-4", active ? "text-[#35462a]" : "text-muted-foreground")} aria-hidden />}
      </span>
      <span
        className={cn(
          "num block text-[1.35rem] leading-none font-semibold tracking-[-.06em] sm:mt-4 sm:text-[1.9rem]",
          !active && health === "delayed" && value > 0 && "text-delayed",
        )}
      >
        {value}
      </span>
      <span className={cn("mt-2 block text-[10px] font-medium sm:text-[13px]", active ? "text-[#35462a]" : "text-muted-foreground")}>
        {label}
      </span>
    </>
  );
  const cls = cn(
    "min-w-0 rounded-2xl border px-1.5 py-3 text-center sm:text-left transition-[background-color,border-color,box-shadow] duration-200 sm:p-4",
    active ? "border-[#cce66b] bg-[#dcf57b] text-[#1c2a19]" : "border-border bg-card text-foreground",
    onClick && !active && "hover:border-primary/35 hover:shadow-sm",
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls} data-testid={testId}>
      {content}
    </button>
  ) : (
    <div className={cls} data-testid={testId}>
      {content}
    </div>
  );
}
