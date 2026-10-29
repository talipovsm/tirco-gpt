import { ArrowUpRight, CalendarDays, Package, Truck } from "lucide-react";
import Link from "next/link";
import { CompanyBadge, MoneyDisplay } from "@/components/common/misc";
import { RouteDistance, type RouteSummary } from "@/components/common/route-distance";
import { RouteChain } from "@/components/common/route-timeline";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateRange, formatVolume, formatWeight } from "@/lib/format";
import { label } from "@/lib/i18n";

export type LoadCardData = {
  id: string;
  publicNumber: string;
  title: string;
  status: string;
  weightKg: number;
  volumeM3: number | null;
  bodyType: string | null;
  priceType: string;
  targetPrice: number | null;
  currency: string;
  loadingDateFrom: Date;
  loadingDateTo: Date | null;
  deliveryDateFrom: Date | null;
  deliveryDateTo: Date | null;
  stops: { country: string; city: string; type: string }[];
  company: { id: string; legalName: string; verificationStatus: string };
  _count?: { bids: number };
  bids?: { status: string; amount: number; currency: string }[];
} & Partial<RouteSummary>;

/** Маршрут, доступная ставка и условия загрузки читаются как отдельные группы. */
export function LoadCard({ load, showCompany = true }: { load: LoadCardData; showCompany?: boolean }) {
  const myBid = load.bids?.find((b) => b.status === "PENDING" || b.status === "ACCEPTED");
  const quote = load.priceType === "REQUEST_QUOTE" || load.targetPrice === null;
  return (
    <Link
      href={`/loads/${load.id}`}
      className="group border-border bg-card hover:border-primary/45 hover:shadow-control mx-3 my-3 block rounded-xl border p-4 transition-[border-color,box-shadow] duration-(--duration-standard) sm:p-5"
      data-testid="load-card"
    >
      <div data-row-content className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="id-code text-footnote text-muted-foreground font-medium">{load.publicNumber}</span>
            {load.status !== "PUBLISHED" && <StatusBadge kind="LoadStatus" value={load.status} />}
            {load._count && load._count.bids > 0 && (
              <span className="bg-accent text-link text-footnote rounded-full px-2.5 py-1 font-medium">
                Предложений: {load._count.bids}
              </span>
            )}
          </div>
          <RouteChain stops={load.stops} compact className="text-title3 min-w-0 font-semibold" />
          <p className="text-body text-muted-foreground flex min-w-0 items-center gap-2">
            <Package className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{load.title}</span>
          </p>
          <div className="text-footnote text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-4 shrink-0" aria-hidden />
              {formatWeight(load.weightKg)}
              {load.volumeM3 ? ` · ${formatVolume(load.volumeM3)}` : ""} ·{" "}
              {load.bodyType ? label("BodyType", load.bodyType) : "любой кузов"}
            </span>
            <span className="num inline-flex flex-wrap items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">Загрузка: </span>
              {formatDateRange(load.loadingDateFrom, load.loadingDateTo)}
              {(load.deliveryDateFrom || load.deliveryDateTo) && (
                <>
                  {" "}
                  → <span className="sr-only">доставка: </span>
                  {formatDateRange(load.deliveryDateFrom, load.deliveryDateTo)}
                </>
              )}
            </span>
            {load.routeDistanceKm != null && (
              <RouteDistance
                compact
                route={{
                  routeDistanceKm: load.routeDistanceKm,
                  routeDurationMin: load.routeDurationMin ?? null,
                  routeSource: load.routeSource ?? null,
                }}
              />
            )}
          </div>
          {showCompany && <CompanyBadge name={load.company.legalName} verification={load.company.verificationStatus} link={false} />}
        </div>
        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-t pt-3 sm:w-48 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          <div className="min-w-0 sm:text-right">
            <p className="text-footnote text-muted-foreground mb-1">{label("PriceType", load.priceType)}</p>
            {quote ? (
              <span className="text-title3 font-semibold">Запрос цены</span>
            ) : (
              <MoneyDisplay amount={load.targetPrice} currency={load.currency} className="text-title2 font-semibold tracking-tight" />
            )}
            {myBid && (
              <p className={`text-footnote mt-2 ${myBid.status === "ACCEPTED" ? "text-success" : "text-link"}`}>
                Ваше предложение: <MoneyDisplay amount={myBid.amount} currency={myBid.currency} />
              </p>
            )}
          </div>
          <span className="bg-accent text-link text-footnote group-hover:bg-primary group-hover:text-primary-foreground inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors">
            Подробнее <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
