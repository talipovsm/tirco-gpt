"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { LandingLogo } from "./landing-logo";
import { LANDING_SECTIONS } from "./landing-nav";

/**
 * Шапка публичной главной: прозрачная над тёмным первым экраном, при прокрутке — светлая с размытием.
 * На мобильных — раскрывающееся меню (Esc и переход по ссылке закрывают его).
 */
export function LandingHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow] duration-200",
        open
          ? "border-b border-slate-200 bg-white"
          : solid
            ? "border-b border-slate-200/80 bg-white/90 shadow-[0_1px_12px_rgb(15_23_42/0.06)] backdrop-blur-md"
            : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
          aria-label="TIRCO — на главную"
        >
          <LandingLogo tone={solid ? "dark" : "light"} />
        </Link>

        <nav aria-label="Разделы" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {LANDING_SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-500",
                    solid ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              "hidden h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex",
              solid ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10",
            )}
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="bg-primary hover:bg-primary-hover hidden h-10 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex"
          >
            Регистрация
          </Link>
          <button
            type="button"
            className={cn(
              "grid size-11 place-items-center rounded-lg transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-blue-500 lg:hidden",
              solid ? "text-slate-800 hover:bg-slate-100" : "text-white hover:bg-white/10",
            )}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-slate-200 bg-white lg:hidden">
        <nav aria-label="Разделы" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <ul className="grid gap-1">
            {LANDING_SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-base font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 pb-1">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="bg-primary inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Регистрация
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
