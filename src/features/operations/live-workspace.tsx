"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowUpRight, MapPinned } from "lucide-react";
import { SearchField } from "@/components/common/search-field";
import { SplitView } from "@/components/common/split-view";
import { MapWorkspace, type MapObject } from "@/features/tracking/map-workspace";
import type { Health } from "@/lib/operations";
import { cn } from "@/lib/utils";
import type { LiveObject } from "@/server/services/operations.service";
import { OperationalMetric } from "./health";
import { ShipmentDetailPanel } from "./shipment-panel";
import { ShipmentList } from "./shipment-list";

type Filter = "all" | "moving" | "delayed" | "arriving" | "waiting";

const FILTERS: { key: Filter; label: string; health?: Health; match: (h: Health) => boolean }[] = [
  { key: "all", label: "Все", match: () => true },
  { key: "moving", label: "В пути", health: "moving", match: (h) => h === "moving" || h === "arriving" || h === "delayed" },
  { key: "delayed", label: "Задержка", health: "delayed", match: (h) => h === "delayed" },
  { key: "arriving", label: "Прибытие", health: "arriving", match: (h) => h === "arriving" },
  { key: "waiting", label: "Ожидание", health: "waiting", match: (h) => h === "waiting" },
];

export function toMapObject(o: LiveObject): MapObject {
  return {
    id: o.id,
    label: `${o.publicNumber}: ${o.origin} → ${o.destination}, ${o.statusLabel}`,
    health: o.health,
    position: o.position,
    // Маршрут по дорогам, если посчитан; иначе — прямые между точками
    route: o.routeLine ?? o.stops.filter((s) => s.point).map((s) => [s.point!.lng, s.point!.lat] as [number, number]),
  };
}

export type WorkspaceTab = { key: string; label: string; count?: number; content: React.ReactNode };

/** Underlined workspace tabs with keyboard navigation and explicit action counts. */
export function SegmentTabs({
  tabs,
  value,
  onChange,
  idPrefix,
  label,
}: {
  tabs: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (key: string) => void;
  idPrefix: string;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid min-w-0 grid-cols-2 gap-x-3 px-3 sm:flex sm:flex-wrap sm:gap-x-5 sm:px-5">
      {tabs.map((t, index) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          id={`${idPrefix}-${t.key}`}
          aria-selected={value === t.key}
          aria-controls={`${idPrefix}-${t.key}-panel`}
          tabIndex={value === t.key ? 0 : -1}
          onClick={() => onChange(t.key)}
          onKeyDown={(event) => {
            const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            if (!offset && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? tabs[0]
                : event.key === "End"
                  ? tabs[tabs.length - 1]
                  : tabs[(index + offset + tabs.length) % tabs.length];
            onChange(next.key);
            document.getElementById(`${idPrefix}-${next.key}`)?.focus();
          }}
          className={cn(
            "flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-medium transition-colors sm:justify-start sm:text-[13px]",
            value === t.key ? "border-primary text-link" : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                "num rounded-md px-1.5 py-0.5 text-[10px] leading-tight",
                t.key === "attention" && t.count > 0 ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground",
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Перевозки в три колонки: слева — сводка-фильтр, поиск и список; справа — карта и детали выбранной
 * перевозки. Выбор отражается в адресе (?selected=…) — ссылкой можно поделиться; Esc закрывает детали.
 */
export function LiveWorkspace({
  title,
  subtitle,
  actions,
  objects,
  now,
  tabs = [],
  empty,
  listFooter,
  metrics = true,
  controls,
  filterInput = true,
  testId = "live-workspace",
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  objects: LiveObject[];
  now: string;
  initialSelected?: string | null;
  /** Дополнительные вкладки списка (внимание, события, рекомендации). */
  tabs?: WorkspaceTab[];
  empty?: React.ReactNode;
  listFooter?: React.ReactNode;
  metrics?: boolean;
  /** Серверные фильтры (URL) под заголовком. */
  controls?: React.ReactNode;
  /** Быстрый поиск по загруженному списку. */
  filterInput?: boolean;
  testId?: string;
}) {
  const params = useSearchParams();
  const selectedId = params.get("selected");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const [tab, setTab] = React.useState("objects");
  const [clock, setClock] = React.useState({ base: now, elapsed: 0 });
  const referenceTime = clock.base === now ? new Date(new Date(now).getTime() + clock.elapsed).toISOString() : now;
  const tabsId = React.useId();

  // Возраст последней отметки растёт даже без новых координат и не зависит от часов устройства.
  React.useEffect(() => {
    const startedAt = Date.now();
    const updateClock = () => setClock({ base: now, elapsed: Date.now() - startedAt });
    const resumeClock = () => {
      if (!document.hidden) updateClock();
    };
    const timer = setInterval(updateClock, 60_000);
    document.addEventListener("visibilitychange", resumeClock);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resumeClock);
    };
  }, [now]);

  const select = React.useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("selected", id);
    else url.searchParams.delete("selected");
    window.history.pushState(null, "", url);
  }, []);

  const term = q.trim().toLowerCase();
  const active = FILTERS.find((f) => f.key === filter)!;
  const visible = objects.filter(
    (o) =>
      (filter === "all" ? true : active.match(o.health)) &&
      (!term ||
        [
          o.publicNumber,
          o.origin,
          o.destination,
          o.title,
          o.vehicle?.plateNumber,
          o.driver?.fullName,
          o.carrier.legalName,
          o.shipper.legalName,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))),
  );
  const selected = objects.find((o) => o.id === selectedId) ?? null;
  const mapObjects = React.useMemo(() => visible.map(toMapObject), [visible]);

  // Esc закрывает детали
  React.useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, select]);

  const allTabs: WorkspaceTab[] = [{ key: "objects", label: "Перевозки", count: visible.length, content: null }, ...tabs];
  const attention = tabs.find((item) => item.key === "attention");

  const list = (
    <>
      <div className="border-border shrink-0 border-b">
        {allTabs.length > 1 ? (
          <SegmentTabs tabs={allTabs} value={tab} onChange={setTab} idPrefix={tabsId} label="Разделы панели" />
        ) : (
          <div className="flex min-h-16 items-center justify-between gap-3 px-5">
            <h2 className="text-sm font-semibold">Перевозки</h2>
            <span className="text-muted-foreground text-xs">
              В списке: <span className="num text-foreground font-medium">{visible.length}</span>
            </span>
          </div>
        )}
      </div>
      {controls && <div className="border-border shrink-0 border-b px-1 pt-4 pb-2 sm:px-2">{controls}</div>}
      {filterInput && tab === "objects" && (
        <div className="shrink-0 px-3.5 py-4 sm:px-4">
          <label className="block">
            <span className="sr-only">Найти в списке</span>
            <SearchField
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Номер, город, машина, водитель"
              data-testid="workspace-filter"
            />
          </label>
        </div>
      )}
      <div
        className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain"
        role={allTabs.length > 1 ? "tabpanel" : undefined}
        id={`${tabsId}-${tab}-panel`}
        aria-labelledby={allTabs.length > 1 ? `${tabsId}-${tab}` : undefined}
      >
        {tab === "objects" ? (
          <>
            {visible.length === 0 ? (
              objects.length === 0 ? (
                empty
              ) : (
                <div className="text-muted-foreground px-5 py-12 text-center text-sm">
                  <p>Под фильтр ничего не попало.</p>
                  <button
                    type="button"
                    className="text-link mt-3 font-medium hover:underline"
                    onClick={() => {
                      setFilter("all");
                      setQ("");
                    }}
                  >
                    Сбросить фильтр
                  </button>
                </div>
              )
            ) : (
              <ShipmentList
                objects={visible}
                selectedId={selectedId}
                onSelect={(id) => select(id === selectedId ? null : id)}
                now={referenceTime}
              />
            )}
            {listFooter}
          </>
        ) : (
          <div className="py-4">{allTabs.find((item) => item.key === tab)?.content}</div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 p-4 sm:gap-5 sm:p-6 lg:h-full lg:overflow-hidden xl:p-7">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1.5 hidden text-[10px] font-semibold tracking-[.14em] uppercase sm:block">
            Управление перевозками
          </p>
          <h1 className="text-[25px] leading-tight font-semibold tracking-[-.045em] sm:text-[29px]">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2 text-xs sm:text-[13px]">{subtitle}</p>}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 pt-0.5 sm:w-auto">
          {attention && (attention.count ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => {
                select(null);
                setTab("attention");
                document.getElementById(`${tabsId}-attention`)?.scrollIntoView({ block: "nearest" });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-900"
            >
              <AlertCircle className="size-4" aria-hidden /> Внимание: {attention.count} <ArrowUpRight className="size-3.5" aria-hidden />
            </button>
          )}
          {actions}
        </div>
      </header>
      {metrics && (
        <div
          className="grid shrink-0 grid-cols-5 gap-1.5 sm:gap-3"
          role="group"
          aria-label="Фильтр по состоянию"
          data-testid="ops-indicators"
        >
          {FILTERS.map((item) => (
            <OperationalMetric
              key={item.key}
              label={item.label}
              value={objects.filter((o) => item.match(o.health)).length}
              health={item.health}
              active={filter === item.key}
              onClick={() => {
                select(null);
                setFilter(item.key);
                setTab("objects");
              }}
            />
          ))}
        </div>
      )}
      <div className="min-h-0 shrink-0 lg:flex-1 lg:shrink">
        <SplitView
          testId={testId}
          listLabel={title}
          backLabel={title}
          hasDetail={Boolean(selected)}
          onBack={() => select(null)}
          list={list}
          mapHeader={
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary/8 text-link grid size-8 place-items-center rounded-lg">
                  <MapPinned className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold">Карта маршрутов</h2>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">Маршруты и последние отметки</p>
                </div>
              </div>
              <span className="num bg-muted text-muted-foreground rounded-lg px-2 py-1 text-[11px]">{visible.length}</span>
            </div>
          }
          map={
            <MapWorkspace
              objects={mapObjects}
              now={referenceTime}
              selectedId={selectedId}
              onSelect={(id) => select(id)}
              className="absolute inset-0"
              emptyLabel="Нет объектов с координатами"
            />
          }
          detail={selected && <ShipmentDetailPanel key={selected.id} object={selected} now={referenceTime} onClose={() => select(null)} />}
        />
      </div>
    </div>
  );
}
