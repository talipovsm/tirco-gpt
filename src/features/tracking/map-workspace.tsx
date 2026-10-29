"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import { Maximize2, Minus, Plus } from "lucide-react";
import * as React from "react";
import type { Health } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { BASEMAP_FAILED_TEXT, cssColor, healthColors, mapStyle, useDarkScheme, watchBasemap } from "./map-style";
import { describePosition } from "./position-freshness";

/** Объект карты: перевозка/машина с позицией и маршрутом. */
export type MapObject = {
  id: string;
  label: string;
  health: Health;
  position: { lat: number; lng: number; source?: "tracking" | "estimated"; at?: string | null } | null;
  /** Маршрут [lng, lat] по точкам загрузки → границы → разгрузки. */
  route: [number, number][];
};

type Padding = { top: number; right: number; bottom: number; left: number };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function boundsOf(points: [number, number][]) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ] as [[number, number], [number, number]];
}

function markerStyle(el: HTMLElement, color: string, selected: boolean, estimated = false) {
  const size = selected ? 24 : 16;
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:9999px",
    `background:${estimated ? cssColor("--card", "#ffffff") : color}`,
    `border:2.5px ${estimated ? "dashed" : "solid"} ${estimated ? color : "#ffffff"}`,
    `box-shadow:0 1px 3px rgb(0 0 0 / .3)${selected ? `, 0 0 0 6px ${color}38` : ""}`,
    "padding:0",
    "cursor:pointer",
    "transition:width 200ms cubic-bezier(.32,.72,0,1),height 200ms cubic-bezier(.32,.72,0,1),box-shadow 200ms",
    `z-index:${selected ? 2 : 1}`,
  ].join(";");
}

/**
 * Рабочая карта операций: живые объекты (маркеры по состоянию), маршруты, выбор объекта,
 * плавное перемещение маркеров и «прорисовка» маршрута выбранной перевозки.
 */
export function MapWorkspace({
  objects,
  selectedId,
  onSelect,
  padding,
  className,
  emptyLabel = "Нет объектов с координатами",
  now,
}: {
  objects: MapObject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Отступы камеры под панели поверх карты. */
  padding?: Partial<Padding>;
  className?: string;
  emptyLabel?: string;
  now?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MLMap | null>(null);
  const markers = React.useRef(new Map<string, { marker: Marker; el: HTMLButtonElement; lng: number; lat: number }>());
  const lib = React.useRef<typeof import("maplibre-gl") | null>(null);
  const onSelectRef = React.useRef(onSelect);
  const fitted = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [basemapFailed, setBasemapFailed] = React.useState(false);
  // Последняя подгонка камеры: повторяется без анимации, когда меняется размер карты
  const refit = React.useRef<(() => void) | null>(null);
  // Номер версии стиля: смена темы пересоздаёт слои, данные синхронизируются заново
  const [styleRev, setStyleRev] = React.useState(0);
  const dark = useDarkScheme();
  const darkRef = React.useRef(dark);
  const pad: Padding = { top: 48, right: 48, bottom: 48, left: 48, ...padding };
  const padKey = JSON.stringify(pad);

  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Инициализация карты — один раз
  React.useEffect(() => {
    let cancelled = false;
    const markerMap = markers.current;
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !ref.current) return;
        if (!maplibregl.getWorkerUrl().startsWith(window.location.origin)) {
          maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
        }
        lib.current = maplibregl;
        const map = new maplibregl.Map({
          container: ref.current,
          style: mapStyle(darkRef.current),
          center: [66, 46],
          zoom: 3,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        mapRef.current = map;
        watchBasemap(map, () => !cancelled && setBasemapFailed(true));
        map.on("style.load", () => {
          const empty = { type: "FeatureCollection" as const, features: [] };
          if (!map.getSource("routes")) map.addSource("routes", { type: "geojson", data: empty });
          if (!map.getSource("selected")) map.addSource("selected", { type: "geojson", data: empty });
          if (!map.getLayer("routes"))
            map.addLayer({
              id: "routes",
              type: "line",
              source: "routes",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.35 },
            });
          if (!map.getLayer("selected-casing"))
            map.addLayer({
              id: "selected-casing",
              type: "line",
              source: "selected",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: { "line-color": cssColor("--card", "#ffffff"), "line-width": 7, "line-opacity": 0.95 },
            });
          if (!map.getLayer("selected"))
            map.addLayer({
              id: "selected",
              type: "line",
              source: "selected",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: { "line-color": ["get", "color"], "line-width": 3.5 },
            });
          if (!cancelled) {
            setReady(true);
            setStyleRev((r) => r + 1);
          }
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      markerMap.forEach((m) => m.marker.remove());
      markerMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      fitted.current = false;
    };
  }, []);

  // Смена системной темы — другой стиль подложки
  React.useEffect(() => {
    if (darkRef.current === dark) return;
    darkRef.current = dark;
    mapRef.current?.setStyle(mapStyle(dark));
  }, [dark]);

  // Карта следует за размером блока (колонка деталей меняет высоту карты)
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
      refit.current?.();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const objectsKey = JSON.stringify(objects);

  // Синхронизация маркеров и маршрутов с данными
  React.useEffect(() => {
    const map = mapRef.current;
    const maplibregl = lib.current;
    if (!ready || !map || !maplibregl) return;
    const list = JSON.parse(objectsKey) as MapObject[];
    const animate = !reducedMotion();
    const colors = healthColors();
    (map.getSource("routes") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: list
        .filter((o) => o.route.length > 1 && o.id !== selectedId)
        .map((o) => ({
          type: "Feature" as const,
          properties: { color: colors[o.health] },
          geometry: { type: "LineString" as const, coordinates: o.route },
        })),
    });

    const seen = new Set<string>();
    for (const o of list) {
      if (!o.position) continue;
      const position = describePosition(o.position, now ? new Date(now) : new Date());
      const markerLabel = position.source === "unknown" ? o.label : `${o.label}. ${position.label}`;
      const estimated = position.source === "estimated";
      seen.add(o.id);
      const existing = markers.current.get(o.id);
      if (existing) {
        markerStyle(existing.el, colors[o.health], o.id === selectedId, estimated);
        existing.el.setAttribute("aria-label", markerLabel);
        existing.el.title = `${markerLabel}. ${position.description}`;
        existing.el.dataset.positionSource = position.source;
        existing.el.setAttribute("aria-pressed", String(o.id === selectedId));
        const { lng: fromLng, lat: fromLat } = existing;
        const { lng: toLng, lat: toLat } = o.position;
        if (fromLng !== toLng || fromLat !== toLat) {
          existing.lng = toLng;
          existing.lat = toLat;
          if (!animate) existing.marker.setLngLat([toLng, toLat]);
          else {
            // Плавное перемещение маркера к новой позиции (800 мс)
            const start = performance.now();
            const step = (t: number) => {
              const k = Math.min(1, (t - start) / 800);
              const e = 1 - Math.pow(1 - k, 3);
              existing.marker.setLngLat([fromLng + (toLng - fromLng) * e, fromLat + (toLat - fromLat) * e]);
              if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        }
        continue;
      }
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", markerLabel);
      el.title = `${markerLabel}. ${position.description}`;
      el.dataset.positionSource = position.source;
      el.setAttribute("aria-pressed", String(o.id === selectedId));
      el.dataset.objectId = o.id;
      markerStyle(el, colors[o.health], o.id === selectedId, estimated);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(o.id);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat([o.position.lng, o.position.lat]).addTo(map);
      markers.current.set(o.id, { marker, el, lng: o.position.lng, lat: o.position.lat });
    }
    for (const [id, m] of markers.current) {
      if (!seen.has(id)) {
        m.marker.remove();
        markers.current.delete(id);
      }
    }

    // Первая подгонка камеры — под все объекты
    if (!fitted.current) {
      const pts = list.flatMap((o) => [...o.route, ...(o.position ? [[o.position.lng, o.position.lat] as [number, number]] : [])]);
      if (pts.length) {
        map.fitBounds(boundsOf(pts), { padding: JSON.parse(padKey) as Padding, maxZoom: 7, duration: 0 });
        fitted.current = true;
      }
    }
  }, [ready, objectsKey, selectedId, padKey, styleRev, now]);

  // Выбранная перевозка: маршрут прорисовывается от загрузки к разгрузке, камера переходит к объекту
  React.useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const src = map.getSource("selected") as GeoJSONSource | undefined;
    const list = JSON.parse(objectsKey) as MapObject[];
    const sel = list.find((o) => o.id === selectedId);
    if (!sel) {
      src?.setData({ type: "FeatureCollection", features: [] });
      const all = list.flatMap((o) => [...o.route, ...(o.position ? [[o.position.lng, o.position.lat] as [number, number]] : [])]);
      refit.current = all.length
        ? () => map.fitBounds(boundsOf(all), { padding: JSON.parse(padKey) as Padding, maxZoom: 7, duration: 0 })
        : null;
      return;
    }
    const color = healthColors()[sel.health];
    const route = sel.route;
    const feature = (coords: [number, number][]) => ({
      type: "Feature" as const,
      properties: { color },
      geometry: { type: "LineString" as const, coordinates: coords },
    });
    let raf = 0;
    if (route.length > 1 && !reducedMotion()) {
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / 700);
        const e = 1 - Math.pow(1 - k, 3);
        const total = route.length - 1;
        const pos = e * total;
        const i = Math.floor(pos);
        const f = pos - i;
        const head = route.slice(0, i + 1);
        if (i < total) head.push([route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f]);
        src?.setData(feature(head.length > 1 ? head : route.slice(0, 2)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else if (route.length > 1) {
      src?.setData(feature(route));
    }
    const pts = [...route, ...(sel.position ? [[sel.position.lng, sel.position.lat] as [number, number]] : [])];
    const fit = (duration: number) => {
      if (pts.length > 1) map.fitBounds(boundsOf(pts), { padding: JSON.parse(padKey) as Padding, maxZoom: 8, duration });
      else if (pts.length === 1) map.easeTo({ center: pts[0], zoom: Math.max(map.getZoom(), 6), duration });
    };
    refit.current = () => fit(0);
    fit(reducedMotion() ? 0 : 700);
    return () => cancelAnimationFrame(raf);
  }, [ready, selectedId, objectsKey, padKey, styleRev]);

  const fitAll = () => {
    const map = mapRef.current;
    if (!map) return;
    const list = JSON.parse(objectsKey) as MapObject[];
    const pts = list.flatMap((o) => [...o.route, ...(o.position ? [[o.position.lng, o.position.lat] as [number, number]] : [])]);
    if (pts.length)
      map.fitBounds(boundsOf(pts), { padding: JSON.parse(padKey) as Padding, maxZoom: 7, duration: reducedMotion() ? 0 : 500 });
  };

  const hasData = objects.some((o) => o.position || o.route.length > 1);

  return (
    <div className={cn("bg-muted relative isolate overflow-hidden", className)}>
      {failed ? (
        <div className="text-subheadline text-muted-foreground absolute inset-0 grid place-items-center p-6 text-center">
          Карта недоступна в этом браузере — объекты перечислены в списке.
        </div>
      ) : (
        <>
          <div
            ref={ref}
            style={{ position: "absolute", inset: 0 }}
            role="region"
            aria-label={`Карта операций: объектов ${objects.length}`}
          />
          {!ready && <div className="skeleton absolute inset-0 rounded-none" aria-hidden />}
          {ready && objects.some((o) => o.position?.source) && (
            <div
              className="bg-card/95 border-border text-muted-foreground pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%_-_4.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-2.5 py-2 text-[10px] shadow-sm"
              role="group"
              aria-label="Источник позиции на карте"
              data-testid="map-position-legend"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-foreground size-2.5 rounded-full" aria-hidden /> GPS
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="border-foreground size-2.5 rounded-full border-2 border-dashed" aria-hidden /> Примерная позиция
              </span>
            </div>
          )}
          {basemapFailed && (
            <p
              className="bg-card/95 border-border text-muted-foreground pointer-events-none absolute bottom-3 left-3 max-w-[80%] rounded-lg border px-3 py-2 text-[11px] shadow-sm"
              role="status"
            >
              {BASEMAP_FAILED_TEXT}
            </p>
          )}
          {ready && !hasData && (
            <p className="bg-card/95 border-border text-muted-foreground pointer-events-none absolute top-1/2 left-1/2 max-w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-4 py-3 text-center text-xs shadow-sm">
              {emptyLabel}
            </p>
          )}
          <MapControls
            style={{ top: 12, right: Math.max(12, pad.right - 36) }}
            onZoomIn={() => mapRef.current?.zoomIn({ duration: reducedMotion() ? 0 : 250 })}
            onZoomOut={() => mapRef.current?.zoomOut({ duration: reducedMotion() ? 0 : 250 })}
            onFit={fitAll}
          />
        </>
      )}
    </div>
  );
}

/** Кнопки карты, как в Картах Apple: столбик в материале с волосяными разделителями. */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onFit,
  style,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  style?: React.CSSProperties;
}) {
  const btn =
    "grid size-9 place-items-center text-foreground transition-colors duration-(--duration-micro) hover:bg-muted active:bg-muted focus-visible:relative focus-visible:z-10";
  return (
    <div className="bg-card/95 border-border absolute z-[2] flex flex-col overflow-hidden rounded-lg border shadow-sm" style={style}>
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Приблизить">
        <Plus className="size-4" aria-hidden />
      </button>
      <button type="button" className={cn(btn, "hairline-t")} onClick={onZoomOut} aria-label="Отдалить">
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" className={cn(btn, "hairline-t")} onClick={onFit} aria-label="Показать все объекты">
        <Maximize2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
