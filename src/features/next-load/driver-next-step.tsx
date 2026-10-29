"use client";
import { CircleHelp, Navigation, RotateCcw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useAction } from "@/lib/client/use-action";

const QUICK: { country: string; city: string }[] = [
  { country: "KZ", city: "Астана" },
  { country: "RU", city: "Москва" },
  { country: "RU", city: "Челябинск" },
  { country: "KG", city: "Бишкек" },
  { country: "UZ", city: "Ташкент" },
  { country: "RU", city: "Екатеринбург" },
];

/** Водитель после доставки сообщает, куда планирует ехать дальше — диспетчер получает подходящие грузы. */
export function DriverNextStep({
  orderId,
  deliveryCity,
  returnCity,
  plan,
}: {
  orderId: string;
  deliveryCity: string;
  returnCity: string | null;
  plan: { destinations: string[]; matches: number } | null;
}) {
  const { run, pending } = useAction();
  const send = (body: { intent: string; destinations: { country: string; city: string }[] }) =>
    run(
      (key) =>
        api<{ matchesCount: number }>("/api/next-load/movements", { body: { ...body, sourceOrderId: orderId }, idempotencyKey: key }),
      {
        success: (r) => `Диспетчер получил ваш план. Подходящих грузов: ${r.matchesCount}`,
      },
    );
  const quick = QUICK.filter((c) => c.city !== deliveryCity && c.city !== returnCity);
  return (
    <div className="bg-card border-border space-y-4 rounded-2xl border p-5 sm:p-6" data-testid="driver-next-step">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dcf57b] text-[#111c2e]">
          <Navigation className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-footnote text-muted-foreground mb-0.5">После доставки</p>
          <p className="text-title3 font-semibold">Что планируете дальше?</p>
        </div>
      </div>
      <p className="text-subheadline text-muted-foreground leading-relaxed">
        После разгрузки в {deliveryCity} диспетчер подберёт груз по пути — чтобы не ехать порожняком.
      </p>
      {plan && (
        <p className="bg-accent text-link text-subheadline border-primary/20 rounded-xl border px-3.5 py-3">
          Ваш план: {plan.destinations.length ? plan.destinations.join(", ") : "свободен, грузы рядом"} · подходящих грузов: {plan.matches}
        </p>
      )}
      <div className="grid gap-2">
        {returnCity && (
          <Button
            size="lg"
            variant="outline"
            className="h-12 justify-start"
            disabled={pending}
            onClick={() => send({ intent: "RETURN", destinations: [] })}
          >
            <RotateCcw /> Вернуться в {returnCity}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {quick.map((c) => (
            <Button
              key={c.city}
              size="lg"
              variant="outline"
              className="h-12 min-w-0 justify-start px-3 text-[13px]"
              disabled={pending}
              onClick={() => send({ intent: "CITY", destinations: [c] })}
            >
              В {c.city}
            </Button>
          ))}
        </div>
        <Button
          size="lg"
          variant="ghost"
          className="text-link h-11"
          disabled={pending}
          onClick={() => send({ intent: "UNDECIDED", destinations: [] })}
        >
          <CircleHelp /> Пока не знаю
        </Button>
      </div>
    </div>
  );
}
