import { cn } from "@/lib/utils";

export function LandingLogo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="12" fill="#dcf57b" />
        <path d="M9 11h22v6h-8v13h-6V17H9Z" fill="#142033" />
        <path d="M27 23h5v7h-5Z" fill="#142033" />
      </svg>
      <span className={cn("text-[24px] font-bold tracking-[-0.05em]", tone === "light" ? "text-white" : "text-[#111c2e]")}>
        tirco<span className="text-[#2854d9]">.</span>
      </span>
    </span>
  );
}
