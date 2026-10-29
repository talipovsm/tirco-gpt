import { ArrowLeft, ArrowRight, FileCheck2, Package, Route, Truck } from "lucide-react";
import Link from "next/link";
import { LandingLogo } from "@/features/landing/landing-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card text-foreground grid min-h-dvh lg:grid-cols-[0.94fr_1.06fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#111c2e] px-10 py-10 text-white lg:flex xl:px-16">
        <Link href="/" aria-label="TIRCO — на главную" className="w-fit rounded-xl">
          <LandingLogo />
        </Link>
        <div className="mx-auto w-full max-w-lg py-16">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#dcf57b] uppercase">Ваше рабочее пространство</p>
          <h2 className="mt-6 text-[48px] leading-[1.08] font-semibold tracking-[-0.045em] xl:text-[56px]">
            Каждый рейс.
            <br />
            <span className="text-[#dcf57b]">На одной волне.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-[#b5c3d7]">
            Грузы, команда и документы в едином процессе международной перевозки.
          </p>
          <div className="mt-12 rounded-2xl border border-white/15 bg-white/[0.035] p-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Route className="size-4 text-[#dcf57b]" aria-hidden />
                Маршрут работы
              </span>
              <span className="text-xs text-[#9cadc4]">От заявки до доставки</span>
            </div>
            <div className="mt-7 flex items-center justify-between gap-2">
              {[
                { icon: Package, title: "Груз" },
                { icon: Truck, title: "Перевозка" },
                { icon: FileCheck2, title: "Доставка" },
              ].map((item, index) => (
                <div key={item.title} className="contents">
                  <div className="flex flex-col items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-xl border border-white/15 bg-[#1a2940]">
                      <item.icon className="size-5 text-[#dcf57b]" strokeWidth={1.7} aria-hidden />
                    </span>
                    <span className="text-xs text-[#ccd6e5]">{item.title}</span>
                  </div>
                  {index < 2 && <ArrowRight className="mb-7 size-4 text-[#687e9c]" aria-hidden />}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#9cadc4]">
          <span>Китай · Казахстан · Центральная Азия · Россия</span>
          <span>Tirco</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-5">
          <Link href="/" aria-label="TIRCO — на главную" className="lg:hidden">
            <LandingLogo tone="dark" />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-[#697b92] hover:text-[#2854d9]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            На главную
          </Link>
        </div>
        <main className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-[28rem]">{children}</div>
        </main>
        <footer className="text-center text-xs leading-6 text-[#78889e]">Tirco · Международные перевозки в одном пространстве</footer>
      </div>
    </div>
  );
}
