import { ArrowRight, MapPin, Route, Search, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Empty workspace points to the first real step, without invented routes or figures. */
export function OperationsEmpty({ kind }: { kind: "customer" | "forwarder" | "carrier" }) {
  const carrier = kind === "carrier";
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:py-16" data-testid="operations-empty">
      <div className="relative mb-6 flex h-20 w-40 items-center justify-center gap-4" aria-hidden>
        <span className="border-border bg-muted grid size-10 place-items-center rounded-xl border">
          <MapPin className="text-muted-foreground size-4" />
        </span>
        <span className="border-border w-8 border-t-2 border-dashed" />
        <span className="grid size-14 place-items-center rounded-2xl bg-[#dcf57b] text-[#26341b] shadow-[0_6px_18px_rgba(130,150,80,.1)]">
          <Truck className="size-6" />
        </span>
      </div>
      <p className="text-lg font-semibold tracking-[-.03em]">Активных перевозок нет</p>
      <p className="text-muted-foreground mt-2.5 max-w-xs text-[13px] leading-relaxed">
        {carrier
          ? "Возьмите груз на бирже — после выбора заказчиком рейс появится здесь с маршрутом, машиной и водителем."
          : "Разместите груз и получите предложения перевозчиков. Здесь можно будет вести рейс от загрузки до доставки."}
      </p>
      <Button asChild className="mt-6">
        <Link href={carrier ? "/marketplace" : "/loads/new"}>
          {carrier ? <Search className="size-4" /> : <Route className="size-4" />}
          {carrier ? "Найти груз" : "Создать груз"}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

export function FilteredEmpty({ resetHref }: { resetHref?: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <span className="bg-muted text-muted-foreground mb-4 grid size-12 place-items-center rounded-xl">
        <Search className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium">{resetHref ? "Под фильтры ничего не попало" : "Записей нет"}</p>
      {resetHref && (
        <Link href={resetHref} className="text-link mt-3 text-xs font-medium hover:underline">
          Сбросить фильтры
        </Link>
      )}
    </div>
  );
}
