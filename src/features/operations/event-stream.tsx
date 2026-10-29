import { ArrowUpRight, Radio } from "lucide-react";
import Link from "next/link";
import { statusTone } from "@/components/common/status-badge";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OperationalEvent } from "@/server/services/operations.service";

const TONE_DOT: Record<string, string> = {
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
  neutral: "bg-neutral",
  delayed: "bg-delayed",
  outline: "bg-neutral",
};

/** The latest real shipment events, grouped visually by a continuous activity rail. */
export function EventStream({ events, now, className }: { events: OperationalEvent[]; now: string; className?: string }) {
  if (events.length === 0)
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 px-5 py-14 text-center text-sm">
        <Radio className="size-7" aria-hidden />
        <p>Событий пока нет.</p>
      </div>
    );
  const ref = new Date(now);
  return (
    <ol className={cn("space-y-1 px-4 sm:px-5", className)} data-testid="event-stream">
      {events.map((event, index) => (
        <li key={event.id} className="relative pl-7">
          {index < events.length - 1 && <span className="bg-border absolute top-5 bottom-[-.6rem] left-[5px] w-px" aria-hidden />}
          <span
            className={cn(
              "ring-card absolute top-4 left-px size-2.5 rounded-full ring-4",
              TONE_DOT[statusTone("OrderStatus", event.status)],
            )}
            aria-hidden
          />
          <Link href={`/orders/${event.orderId}`} className="hover:bg-muted/60 group block rounded-xl px-3 py-3 transition-colors">
            <span className="flex items-start justify-between gap-3">
              <span className="text-[13px] leading-snug font-medium">{event.title}</span>
              <ArrowUpRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
            </span>
            <span className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="id-code">{event.publicNumber}</span>
              <span aria-hidden>·</span>
              <time dateTime={event.at}>{formatRelative(event.at, ref)}</time>
            </span>
            {event.comment && <span className="text-muted-foreground mt-1.5 block text-xs leading-relaxed">{event.comment}</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}
