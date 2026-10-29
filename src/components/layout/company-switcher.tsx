"use client";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientActor } from "@/lib/auth/actor";
import { api, errorMessage } from "@/lib/client/api";
import { label } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Текущая компания внизу сайдбара (и в «Ещё» на телефоне): название, роль, смена компании. */
export function CompanySwitcher({ actor, inverse = false }: { actor: ClientActor; inverse?: boolean }) {
  const router = useRouter();
  const active = actor.active;
  const switchTo = async (companyId: string) => {
    if (companyId === active?.companyId) return;
    try {
      const res = await api<{ redirectTo: string }>("/api/auth/switch-company", { body: { companyId } });
      toast.success("Компания переключена");
      router.push(res.redirectTo);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
          inverse ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-border bg-card text-foreground hover:bg-muted",
        )}
        aria-label="Текущая компания"
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            inverse ? "text-sidebar-foreground bg-white/10" : "bg-accent text-link",
          )}
          aria-hidden
        >
          <Building2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold">{active?.company.legalName ?? "Нет компании"}</span>
          <span className={cn("mt-0.5 block truncate text-[10px]", inverse ? "text-sidebar-muted" : "text-muted-foreground")}>
            {active ? label("MemberRole", active.role) : ""}
          </span>
        </span>
        <ChevronsUpDown className={cn("size-3.5 shrink-0", inverse ? "text-sidebar-muted" : "text-muted-foreground")} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuLabel>{actor.memberships.length > 1 ? "Сменить компанию" : "Компания"}</DropdownMenuLabel>
        {actor.memberships.map((m) => (
          <DropdownMenuItem key={m.companyId} onSelect={() => switchTo(m.companyId)} className="py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{m.company.legalName}</span>
              <span className="text-footnote block opacity-70">{label("MemberRole", m.role)}</span>
            </span>
            {m.companyId === active?.companyId && <Check aria-label="Текущая" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/company/new")}>
          <Plus /> Создать ещё одну компанию
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
