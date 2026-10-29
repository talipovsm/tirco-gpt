"use client";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { LandingLogo } from "./landing-logo";
import { LANDING_SECTIONS } from "./landing-nav";

export function LandingHeader() {
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="relative z-40 border-b border-white/10 bg-[#111c2e] text-white">
      <div className="mx-auto flex h-22 max-w-7xl items-center gap-10 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="TIRCO — на главную"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dcf57b]"
        >
          <LandingLogo />
        </Link>
        <nav aria-label="Разделы" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {LANDING_SECTIONS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-sm font-medium text-[#c4cddb] transition-colors hover:text-white">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-5">
          <Link href="/login" className="hidden rounded-lg px-2 py-3 text-sm font-semibold text-white hover:text-[#dcf57b] sm:inline-flex">
            Войти
          </Link>
          <Link
            href="/register"
            className="hidden h-11 items-center gap-3 rounded-xl bg-[#dcf57b] px-5 text-sm font-semibold text-[#111c2e] transition-colors hover:bg-[#e6ff8d] sm:inline-flex"
          >
            Создать аккаунт <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(!open)}
            className="grid size-11 place-items-center rounded-xl border border-white/20 text-white lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      <div id={menuId} hidden={!open} className="border-t border-white/10 px-5 py-5 lg:hidden">
        <nav aria-label="Разделы">
          <ul className="space-y-1">
            {LANDING_SECTIONS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base text-[#d3dce9] hover:bg-white/5"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
            <Link href="/login" className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-semibold">
              Войти
            </Link>
            <Link href="/register" className="rounded-xl bg-[#dcf57b] px-4 py-3 text-center text-sm font-semibold text-[#111c2e]">
              Регистрация
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
