"use client";
import { ArrowUpRight, ChevronRight, Ellipsis, PanelLeft, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { InsetGroup, InsetList, ListRow } from "@/components/common/inset-group";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import type { ClientActor } from "@/lib/auth/actor";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DataModeBadge, DataModeSwitchDialog } from "@/features/auth/data-mode";
import { CommandBar, CommandTrigger } from "./command-bar";
import { CompanySwitcher } from "./company-switcher";
import { navItems, SIDEBAR_COOKIE, type NavItem, type NavKind } from "./nav-config";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

function isActive(pathname: string, href: string) {
  if (["/dashboard", "/admin", "/driver"].includes(href)) return pathname === href;
  if (href === "/loads") return pathname === "/loads" || (pathname.startsWith("/loads/") && !pathname.startsWith("/loads/new"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

const WORKSPACE_ROUTES = new Set(["/dashboard", "/orders", "/vehicles"]);
const ADMIN_ITEM: NavItem = { href: "/admin", label: t("nav.admin"), icon: ShieldCheck };
const WORKSPACE_LABELS: Record<NavKind, string> = {
  customer: "Грузовладелец",
  forwarder: "Экспедитор",
  carrier: "Перевозчик",
  driver: "Кабинет водителя",
  admin: "Администрирование",
  none: "Рабочее пространство",
};

export function TircoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10 shrink-0", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#dcf57b" />
      <path d="M9 11h22v6h-8v13h-6V17H9Z" fill="#142033" />
      <path d="M27 23h5v7h-5Z" fill="#142033" />
    </svg>
  );
}

export function Logo({ className, dark, compact }: { className?: string; dark?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <TircoMark className="size-8 sm:size-9" />
      {!compact && (
        <span className={cn("text-[23px] font-extrabold tracking-[-0.06em]", dark ? "text-white" : "text-foreground")}>
          tirco<span className="text-link">.</span>
        </span>
      )}
    </span>
  );
}

function groupBySection(items: NavItem[]) {
  const groups: { section?: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }
  return groups;
}

function SidebarRow({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
        active ? "bg-sidebar-active text-sidebar-active-foreground" : "text-sidebar-foreground hover:bg-white/6 hover:text-white",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "opacity-100" : "opacity-65 group-hover:opacity-100")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "num grid min-w-5 place-items-center rounded-md px-1 py-0.5 text-[10px] font-bold",
            active ? "bg-black/10" : "bg-white/10 text-white",
          )}
        >
          {count > 99 ? "99+" : count}
          <span className="sr-only"> непрочитанных</span>
        </span>
      )}
      {active && count === 0 && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
    </Link>
  );
}

export function AppShell({
  actor,
  kind,
  unreadMessages,
  sidebarCollapsed = false,
  children,
}: {
  actor: ClientActor;
  kind: NavKind;
  unreadMessages: number;
  sidebarCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(sidebarCollapsed);
  const [modeDialog, setModeDialog] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const pathname = usePathname();
  const items = navItems(kind);
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const adminLink = actor.isAdmin && kind !== "admin";
  const home = kind === "driver" ? "/driver" : kind === "admin" ? "/admin" : "/dashboard";
  const workspace = WORKSPACE_ROUTES.has(pathname);
  const searchable = kind !== "driver" && kind !== "none";
  const demo = actor.dataMode === "demo";
  const canCreate = kind === "customer" || kind === "forwarder";
  const moreActive = !primary.some((i) => isActive(pathname, i.href));
  const hasMore = items.length > primary.length || adminLink || actor.memberships.length > 1;
  const activeItem = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => isActive(pathname, item.href));

  React.useEffect(() => {
    if (!searchable) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchable]);

  const toggleSidebar = () => {
    const next = !hidden;
    setHidden(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };
  const toggle = (inverse = false) => (
    <Tooltip content={hidden ? t("nav.showSidebar") : t("nav.hideSidebar")} side="bottom">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={hidden ? t("nav.showSidebar") : t("nav.hideSidebar")}
        aria-expanded={!hidden}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
          inverse ? "text-sidebar-muted hover:bg-white/8 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <PanelLeft className="size-[18px]" aria-hidden />
      </button>
    </Tooltip>
  );

  return (
    <div
      className={cn("bg-background min-h-dvh transition-[padding] duration-200 motion-reduce:transition-none", !hidden && "lg:pl-64")}
      data-workspace={workspace || undefined}
    >
      <a
        href="#main"
        className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-xl focus:px-4 focus:py-3 focus:shadow-lg"
      >
        {t("nav.skipToContent")}
      </a>
      <aside
        className={cn(
          "border-sidebar-border bg-sidebar-solid fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r transition-transform duration-200 motion-reduce:transition-none lg:flex",
          hidden && "-translate-x-full",
        )}
        aria-label="Навигация Tirco"
        inert={hidden || undefined}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-5">
          <Link href={home} className="rounded-xl" aria-label="Tirco — на главную">
            <Logo dark />
          </Link>
          {toggle(true)}
        </div>
        <div className="px-5 pb-5">
          <div className="text-sidebar-muted mb-5 border-t border-white/10 pt-4 text-[10px] font-semibold tracking-[0.16em]">
            МЕЖДУНАРОДНАЯ ЛОГИСТИКА
          </div>
          {(canCreate || kind === "carrier") && (
            <Link
              href={canCreate ? "/loads/new" : "/marketplace"}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-lime)] px-3 text-[13px] font-semibold text-[#172333] transition hover:brightness-105"
            >
              {canCreate ? <Plus className="size-4" /> : <Search className="size-4" />}
              {canCreate ? "Создать груз" : "Найти груз"}
              <ArrowUpRight className="ml-auto size-4" />
            </Link>
          )}
        </div>
        <nav aria-label={t("nav.mainNavigation")} className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {groupBySection(items.filter((item) => item.href !== "/loads/new")).map((group, gi) => (
            <div key={group.section ?? gi} className="mb-4 flex flex-col gap-1">
              <span className="text-sidebar-muted px-3 pt-1 pb-2 text-[10px] font-semibold tracking-[0.12em] uppercase">
                {group.section ?? "Рабочий стол"}
              </span>
              {group.items.map((item) => (
                <SidebarRow
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  count={item.badge === "messages" ? unreadMessages : 0}
                />
              ))}
            </div>
          ))}
          {adminLink && <SidebarRow item={ADMIN_ITEM} active={false} count={0} />}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-3">
          {actor.memberships.length > 0 ? (
            <CompanySwitcher actor={actor} inverse />
          ) : (
            <div className="text-sidebar-foreground px-3 py-2 text-sm">{WORKSPACE_LABELS[kind]}</div>
          )}
          <p className="text-sidebar-muted px-3 pt-3 text-[10px] tracking-wide">TIRCO · ЕДИНОЕ ПРОСТРАНСТВО ПЕРЕВОЗОК</p>
        </div>
      </aside>
      <header
        className={cn(
          "border-border bg-card sticky top-0 z-20 border-b pt-[env(safe-area-inset-top)]",
          demo && "border-t-warning border-t-2",
        )}
      >
        <div className="flex h-16 min-w-0 items-center gap-2 px-3 sm:px-6 lg:h-20 lg:px-7">
          <div className="flex items-center gap-2 lg:hidden">
            <Link href={home} aria-label="Tirco — на главную">
              <Logo compact />
            </Link>
          </div>
          {hidden && (
            <div className="hidden items-center gap-3 lg:flex">
              {toggle()}
              <Link href={home} aria-label="Tirco — на главную">
                <Logo compact />
              </Link>
            </div>
          )}
          <div className="min-w-0 flex-1 lg:flex-none lg:pr-5">
            <div className="text-muted-foreground hidden items-center gap-2 text-xs lg:flex">
              {WORKSPACE_LABELS[kind]}
              <ChevronRight className="size-3" />
            </div>
            <p className="truncate text-[14px] font-semibold lg:mt-1">{activeItem?.label ?? "Рабочее пространство"}</p>
          </div>
          {searchable && <CommandTrigger onOpen={() => setCommandOpen(true)} className="mr-auto hidden w-full max-w-[360px] xl:flex" />}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            {searchable && (
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="border-border text-muted-foreground hover:bg-muted grid size-11 place-items-center rounded-xl border xl:hidden"
                aria-label="Поиск и команды"
              >
                <Search className="size-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setModeDialog(true)}
              className="hidden min-h-11 items-center rounded-lg sm:inline-flex"
              aria-label={`Режим данных: ${demo ? "демо-база" : "реальная база"}. Сменить режим`}
            >
              <DataModeBadge mode={actor.dataMode} />
            </button>
            <NotificationBell />
            <span className="bg-border mx-1 hidden h-7 w-px sm:block" aria-hidden />
            <UserMenu actor={actor} kind={kind} />
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={cn(
          "min-w-0 outline-none",
          workspace
            ? "relative pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:h-[calc(100dvh-5rem-env(safe-area-inset-top))] lg:overflow-hidden lg:pb-0"
            : "mx-auto w-full max-w-[1600px] px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-16",
        )}
      >
        {children}
      </main>
      <nav
        aria-label={t("nav.tabBar")}
        className="border-border bg-card fixed inset-x-0 bottom-0 z-30 grid border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_#111c2e08] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + (hasMore ? 1 : 0)}, minmax(0,1fr))` }}
      >
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const count = item.badge === "messages" ? unreadMessages : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                active ? "text-link" : "text-muted-foreground",
              )}
            >
              <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-lg", active && "bg-accent")}>
                <Icon className="size-5" aria-hidden />
                {count > 0 && (
                  <span className="bg-destructive absolute -top-1 right-0 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
              {count > 0 && <span className="sr-only">непрочитанных: {count}</span>}
            </Link>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[10px] font-semibold",
              moreActive ? "text-link" : "text-muted-foreground",
            )}
            aria-haspopup="dialog"
          >
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-lg", moreActive && "bg-accent")}>
              <Ellipsis className="size-5" />
            </span>
            {t("nav.more")}
          </button>
        )}
      </nav>
      <DataModeSwitchDialog current={actor.dataMode} open={modeDialog} onOpenChange={setModeDialog} />
      {searchable && <CommandBar kind={kind} open={commandOpen} onOpenChange={setCommandOpen} />}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="bg-background" aria-describedby={undefined}>
          <div className="shrink-0 px-5 pt-3 pr-16 pb-4">
            <SheetTitle className="text-title2">Все разделы</SheetTitle>
            <p className="text-muted-foreground mt-1 text-sm">{WORKSPACE_LABELS[kind]}</p>
          </div>
          <div
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pt-2 pb-8"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setMoreOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setModeDialog(true);
              }}
              className="border-border bg-card flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium"
            >
              Режим данных <DataModeBadge mode={actor.dataMode} />
            </button>
            {groupBySection(items).map((group, gi) => (
              <InsetGroup key={group.section ?? gi} header={group.section}>
                <InsetList>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const count = item.badge === "messages" ? unreadMessages : 0;
                    return (
                      <ListRow
                        key={item.href}
                        href={item.href}
                        leading={<Icon className="text-link size-5" aria-hidden />}
                        title={<span className={cn(isActive(pathname, item.href) && "font-semibold")}>{item.label}</span>}
                        value={count > 0 ? <span className="num">{count}</span> : undefined}
                      />
                    );
                  })}
                </InsetList>
              </InsetGroup>
            ))}
            {adminLink && (
              <InsetGroup>
                <InsetList>
                  <ListRow href="/admin" leading={<ShieldCheck className="text-link size-5" />} title={t("nav.admin")} />
                </InsetList>
              </InsetGroup>
            )}
            {actor.memberships.length > 0 && (
              <InsetGroup header={t("nav.company")}>
                <div className="p-2">
                  <CompanySwitcher actor={actor} />
                </div>
              </InsetGroup>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
