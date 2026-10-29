import { ArrowRight, Check, FileCheck2, Navigation, Package, Truck } from "lucide-react";

/** Clearly labelled product illustration; no invented customer or performance claims. */
export function HeroVisual() {
  return (
    <div className="relative min-w-0">
      <div className="overflow-hidden rounded-2xl border border-[#dce2ea] bg-white text-[#111c2e] shadow-[0_28px_70px_-28px_#030913]">
        <div className="flex items-center justify-between gap-3 border-b border-[#e8ecf2] px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-[#edf1ff] text-[#2854d9]">
              <Truck className="size-4" aria-hidden />
            </span>
            Рабочее пространство
          </span>
          <span className="rounded-md bg-[#f1f4f8] px-2 py-1 text-[10px] font-medium tracking-wide text-[#64748b] uppercase">
            Пример перевозки
          </span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#64748b]">Международная перевозка</p>
              <h2 className="mt-2 flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
                Урумчи <ArrowRight className="size-5 text-[#99a8be]" aria-hidden /> Алматы
              </h2>
            </div>
            <span className="rounded-full bg-[#edf2ff] px-3 py-1.5 text-xs font-semibold text-[#2854d9]">В пути</span>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-[#e2e8ef] bg-[#f3f6fa] px-4 pt-7 pb-5">
            <svg viewBox="0 0 480 140" className="h-32 w-full" fill="none" aria-hidden>
              <path
                d="M0 32L82 67L147 9L235 47L306 17L397 61L480 23M0 100L70 127L171 77L260 120L355 84L427 130L480 96M44 0L80 140M190 0L214 140M356 0L330 140M453 0L431 140"
                stroke="#dde5ef"
                strokeWidth="1.5"
              />
              <path d="M50 91C94 91 112 43 163 43S217 96 264 96S344 51 418 51" stroke="#2854d9" strokeWidth="3" strokeDasharray="6 5" />
              <circle cx="50" cy="91" r="7" fill="#111c2e" stroke="white" strokeWidth="3" />
              <circle cx="418" cy="51" r="7" fill="#111c2e" stroke="white" strokeWidth="3" />
              <circle cx="264" cy="96" r="15" fill="#dcf57b" stroke="white" strokeWidth="3" />
              <path d="M260 99L264 90L268 99L264 97L260 99Z" fill="#111c2e" />
            </svg>
            <div className="flex justify-between text-xs font-medium text-[#53657b]">
              <span>Отправление · Китай</span>
              <span>Прибытие · Казахстан</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Check, label: "Договор", text: "Подписан", done: true },
              { icon: Navigation, label: "Перевозка", text: "Выполняется", done: false },
              { icon: FileCheck2, label: "Документы", text: "В одном месте", done: false },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#e2e8ef] px-3 py-4">
                <item.icon className={`mb-3 size-4 ${item.done ? "text-[#547620]" : "text-[#2854d9]"}`} aria-hidden />
                <p className="text-[11px] text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-xs font-semibold sm:text-sm">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#111c2e] px-4 py-4 text-white">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
              <Package className="size-4 text-[#dcf57b]" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">Один рейс. Вся команда в курсе.</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#bcc8d9]">Статусы, сообщения и документы связаны с перевозкой.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
