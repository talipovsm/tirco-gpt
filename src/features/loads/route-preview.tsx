"use client";
import * as React from "react";
import { Route } from "lucide-react";
import { RouteDistance, type RouteSummary } from "@/components/common/route-distance";
import { api } from "@/lib/client/api";
import { t } from "@/lib/i18n";

type PreviewStop = { country: string; city: string; street?: string | null; building?: string | null };
type Preview = {
  distanceKm: number | null;
  durationMin: number | null;
  source: RouteSummary["routeSource"];
  located: number;
  total: number;
};

/**
 * Километраж и время в пути в предпросмотре груза. Сервер находит координаты точек и строит маршрут
 * для грузовика (или даёт оценку). Ошибка расчёта не мешает публикации — блок просто скрывается.
 */
export function RoutePreview({ stops }: { stops: PreviewStop[] }) {
  const key = JSON.stringify(stops.map((s) => [s.country, s.city.trim(), s.street?.trim() || null, s.building?.trim() || null]));
  const [state, setState] = React.useState<{ key: string; data: Preview | null } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const parsed = JSON.parse(key) as [string, string, string | null, string | null][];
    if (parsed.length < 2 || parsed.some(([country, city]) => !country || !city)) return;
    api<Preview>("/api/loads/route-preview", {
      body: { stops: parsed.map(([country, city, street, building]) => ({ country, city, street, building })) },
    })
      .then((data) => !cancelled && setState({ key, data }))
      .catch(() => !cancelled && setState({ key, data: null }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = state?.key === key ? state : null;
  if (!current) {
    return (
      <p className="text-muted-foreground text-body" aria-live="polite">
        {t("route.calculating")}
      </p>
    );
  }
  const d = current.data;
  if (!d) return null;
  if (d.distanceKm == null) {
    return <p className="text-muted-foreground text-body">{t("route.notCalculated")}</p>;
  }
  return (
    <div
      className="bg-accent border-primary/15 text-body flex items-start gap-3 rounded-xl border p-4"
      data-testid="route-preview"
      aria-live="polite"
    >
      <Route className="text-link mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="text-caption text-muted-foreground font-medium">Расчёт маршрута</p>
        <RouteDistance
          route={{ routeDistanceKm: d.distanceKm, routeDurationMin: d.durationMin, routeSource: d.source }}
          className="font-medium"
        />
        {d.located < d.total && (
          <p className="text-muted-foreground text-footnote">{t("route.partial", { located: d.located, total: d.total })}</p>
        )}
      </div>
    </div>
  );
}
