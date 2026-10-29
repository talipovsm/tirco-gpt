import { ArrowRight, MapPin, Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/common/misc";
import { InsetGroup } from "@/components/common/inset-group";
import { statusLabel } from "@/components/common/status-badge";
import { formatDateTime, formatWeight } from "@/lib/format";
import { label } from "@/lib/i18n";
import { toPlain } from "@/lib/serialize";
import { RouteDistance } from "@/components/common/route-distance";
import { DriverTripActions } from "@/features/driver/driver-trip";
import { NavigatorLinks } from "@/features/driver/navigator-links";
import { pageActor } from "@/server/page-context";
import { getMyTrip } from "@/server/services/driver-trip.service";
import { driverMovement } from "@/server/services/next-load.service";
import { DriverNextStep } from "@/features/next-load/driver-next-step";

export const metadata: Metadata = { title: "Мой рейс" };

export default async function DriverHomePage() {
  const actor = await pageActor();
  const trip = toPlain(await getMyTrip(actor));
  if (!trip) {
    return (
      <div className="pt-2">
        <h1 className="text-large-title">Мой рейс</h1>
        <EmptyState
          icon={Truck}
          title="У вас нет назначенных рейсов"
          description="Когда диспетчер назначит вас на перевозку, рейс появится здесь, а вы получите уведомление."
        />
      </div>
    );
  }
  const { order, lastLocation, documents } = trip;
  const stops = order.load.stops;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const showNext = ["AT_DELIVERY", "DELIVERED"].includes(order.currentStatus) && Boolean(order.vehicle);
  const plan = showNext ? await driverMovement(actor) : null;
  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="driver-trip">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-footnote text-muted-foreground mb-1 font-semibold tracking-[0.12em] uppercase">Кабинет водителя</p>
          <h1 className="text-large-title">Мой рейс</h1>
        </div>
        <span className="bg-card border-border text-muted-foreground text-footnote inline-flex items-center gap-2 rounded-full border px-3 py-2">
          <Truck className="size-4" aria-hidden /> {statusLabel("OrderStatus", order.currentStatus)}
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl bg-[#111c2e] text-white" aria-label="Рейс">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.1em] uppercase">
            <span className="size-2 rounded-full bg-[#dcf57b]" aria-hidden /> Текущая перевозка
          </p>
          <p className="id-code text-sm font-medium text-slate-200" data-testid="driver-trip-number">
            #{order.publicNumber}
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 py-6 sm:gap-6 sm:px-6 sm:py-7">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 hidden size-5 shrink-0 text-[#dcf57b] sm:block" aria-hidden />
            <div className="min-w-0">
              <p className="mb-1 text-[0.6875rem] font-medium text-slate-300 sm:text-xs">ЗАГРУЗКА · {first.country}</p>
              <p className="text-xl font-semibold tracking-tight sm:text-3xl">{first.city}</p>
            </div>
          </div>
          <ArrowRight className="size-5 text-[#dcf57b] sm:size-6" aria-hidden />
          <div className="min-w-0 text-right">
            <div className="min-w-0">
              <p className="mb-1 text-[0.6875rem] font-medium text-slate-300 sm:text-xs">ДОСТАВКА · {last.country}</p>
              <p className="text-xl font-semibold tracking-tight sm:text-3xl">{last.city}</p>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/15 bg-white/5 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <dt className="mb-1 text-xs text-slate-300">Статус рейса</dt>
            <dd className="text-sm font-semibold text-[#dcf57b]">{statusLabel("OrderStatus", order.currentStatus)}</dd>
          </div>
          {order.vehicle && (
            <div className="min-w-0 text-right">
              <dt className="mb-1 text-xs text-slate-300">Ваш автомобиль</dt>
              <dd className="truncate font-semibold">
                <span className="id-code">{order.vehicle.plateNumber}</span>
              </dd>
              <dd className="mt-1 truncate text-xs text-slate-300">
                {order.vehicle.make} {order.vehicle.model}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DriverTripActions
          orderId={order.id}
          status={order.currentStatus}
          lastLocationAt={lastLocation ? new Date(lastLocation.createdAt).toISOString() : null}
          documents={documents.map((d) => ({ ...d, createdAt: new Date(d.createdAt).toISOString() }))}
          carrierPhone={order.carrier.phone}
        >
          {showNext && (
            <DriverNextStep
              orderId={order.id}
              deliveryCity={last.city}
              returnCity={first.city !== last.city ? first.city : null}
              plan={
                plan
                  ? { destinations: plan.movement.destinations.map((d: { label: string }) => d.label), matches: plan.matchesCount }
                  : null
              }
            />
          )}
        </DriverTripActions>

        <div className="space-y-5">
          <InsetGroup
            header="Маршрут"
            action={order.load.routeDistanceKm != null ? <RouteDistance route={order.load} className="text-muted-foreground" /> : undefined}
          >
            <ol className="space-y-1 p-2">
              {stops.map((s, i) => (
                <li key={s.id} className="bg-surface-secondary flex gap-3 rounded-xl p-3">
                  <span className="bg-card border-border text-link text-footnote num grid size-8 shrink-0 place-items-center rounded-lg border font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-footnote text-muted-foreground">{label("StopType", s.type)}</p>
                    <p className="font-semibold">
                      {s.city} <span className="text-caption text-muted-foreground font-medium">{s.country}</span>
                    </p>
                    {s.fullAddress && <p className="text-subheadline text-muted-foreground">{s.fullAddress}</p>}
                    {s.plannedDateFrom && (
                      <p className="text-subheadline text-muted-foreground num">
                        {formatDateTime(s.plannedDateFrom, s.timezone ?? undefined)} (местное)
                      </p>
                    )}
                    {s.contactPhone && (
                      <a className="text-link text-subheadline" href={`tel:${s.contactPhone}`}>
                        {s.contactName ?? "Контакт"}: {s.contactPhone}
                      </a>
                    )}
                    <NavigatorLinks
                      className="mt-2.5"
                      testId={`driver-navigator-${i + 1}`}
                      target={{ lat: s.latitude, lng: s.longitude, address: s.fullAddress, city: s.city }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </InsetGroup>

          <InsetGroup header="Груз">
            <div className="flex items-start gap-3 p-4">
              <span className="bg-accent text-link grid size-10 shrink-0 place-items-center rounded-xl">
                <Package className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{order.load.title}</p>
                <p className="text-subheadline text-muted-foreground num mt-1">
                  {formatWeight(order.load.weightKg)}
                  {order.load.packagesCount ? ` · ${order.load.packagesCount} ${order.load.packageType ?? "мест"}` : ""}
                  {order.load.temperatureFrom !== null && ` · ${order.load.temperatureFrom}…${order.load.temperatureTo} °C`}
                </p>
              </div>
            </div>
          </InsetGroup>
        </div>
      </div>
    </div>
  );
}
