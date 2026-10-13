import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Знак и словесный логотип TIRCO для публичных страниц. */
export function LandingLogo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-primary grid size-8 shrink-0 place-items-center rounded-lg text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset]">
        <Truck className="size-4.5" aria-hidden />
      </span>
      <span className={cn("text-[1.0625rem] font-bold tracking-[0.14em]", tone === "light" ? "text-white" : "text-foreground")}>TIRCO</span>
    </span>
  );
}
