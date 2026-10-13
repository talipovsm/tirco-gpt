import { ArrowRight, CircleCheck, FileCheck2, Gavel, MapPin } from "lucide-react";
import type { CSSProperties } from "react";

/**
 * Иллюстрация первого экрана: схема коридора Китай — Казахстан — Центральная Азия — Россия,
 * грузы движутся по маршрутам, поверх — карточки в стиле интерфейса TIRCO.
 * Это иллюстрация (не живые данные): подпись говорит об этом явно.
 * Координаты — упрощённая проекция (x ≈ долгота, y ≈ широта), только для рисунка.
 */
type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  hub?: boolean;
  dx?: number;
  dy?: number;
  anchor?: "start" | "end" | "middle";
};

const NODES: Node[] = [
  { id: "msk", label: "Москва", x: 48, y: 70, hub: true, dy: -14 },
  { id: "ekb", label: "Екатеринбург", x: 200, y: 52, dy: -12 },
  { id: "ast", label: "Астана", x: 286, y: 128, dx: 10, dy: -8, anchor: "start" },
  { id: "tas", label: "Ташкент", x: 262, y: 266, dy: 22 },
  { id: "ala", label: "Алматы", x: 330, y: 236, hub: true, dy: 24 },
  { id: "hor", label: "Хоргос", x: 362, y: 214, dx: 8, dy: -10, anchor: "start" },
  { id: "urm", label: "Урумчи", x: 420, y: 196, hub: true, dx: 10, dy: -10, anchor: "start" },
  { id: "xia", label: "Сиань", x: 548, y: 312, dx: -10, dy: -6, anchor: "end" },
  { id: "yiw", label: "Иу", x: 616, y: 392, hub: true, dx: -12, dy: 4, anchor: "end" },
];

const ROUTES = {
  main: "M 616 392 Q 590 340 548 312 Q 480 256 420 196 Q 392 200 362 214 Q 346 226 330 236 Q 300 180 286 128 Q 250 80 200 52 Q 120 50 48 70",
  south: "M 330 236 Q 300 262 262 266",
  north: "M 420 196 Q 360 120 286 128",
};

const packet = (route: keyof typeof ROUTES, duration: number, delay: number): CSSProperties =>
  ({
    offsetPath: `path("${ROUTES[route]}")`,
    "--travel-duration": `${duration}s`,
    "--travel-delay": `${delay}s`,
  }) as CSSProperties;

export function HeroVisual() {
  return (
    <figure className="relative mx-auto w-full max-w-[680px]" aria-labelledby="hero-visual-caption">
      <div className="relative aspect-[660/440] w-full">
        <svg
          viewBox="0 0 660 440"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Схема маршрутов: Иу — Сиань — Урумчи — Хоргос — Алматы — Астана — Екатеринбург — Москва, ответвление на Ташкент"
        >
          <defs>
            <pattern id="landing-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgb(148 163 184 / 0.16)" />
            </pattern>
            <linearGradient id="landing-route" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="45%" stopColor="#5b8cff" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <radialGradient id="landing-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(91 140 255 / 0.22)" />
              <stop offset="100%" stopColor="rgb(91 140 255 / 0)" />
            </radialGradient>
          </defs>
          <rect width="660" height="440" fill="url(#landing-grid)" />
          <ellipse cx="340" cy="220" rx="300" ry="190" fill="url(#landing-glow)" />

          {/* Граница: пунктир между Китаем и Казахстаном */}
          <path
            d="M 378 150 Q 372 200 384 250 Q 392 290 380 330"
            fill="none"
            stroke="rgb(245 158 11 / 0.35)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />

          {/* Маршруты: основание + бегущий поток */}
          {Object.entries(ROUTES).map(([key, d]) => (
            <g key={key}>
              <path d={d} fill="none" stroke="rgb(148 163 184 / 0.22)" strokeWidth={key === "main" ? 3 : 2} strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke="url(#landing-route)"
                strokeWidth={key === "main" ? 2 : 1.5}
                strokeLinecap="round"
                className="landing-flow"
              />
            </g>
          ))}

          {/* Грузы в пути */}
          <circle r="5" fill="#fff" stroke="#1d4ed8" strokeWidth="3" className="landing-travel" style={packet("main", 16, 0)} />
          <circle r="4" fill="#fff" stroke="#f59e0b" strokeWidth="2.5" className="landing-travel" style={packet("main", 16, -8)} />
          <circle r="3.5" fill="#fff" stroke="#38bdf8" strokeWidth="2.5" className="landing-travel" style={packet("north", 9, -3)} />
          <circle r="3.5" fill="#fff" stroke="#22c55e" strokeWidth="2.5" className="landing-travel" style={packet("south", 6, -1)} />

          {/* Узлы */}
          {NODES.map((n) => (
            <g key={n.id}>
              {n.hub && <circle cx={n.x} cy={n.y} r="9" fill="none" stroke="#5b8cff" strokeWidth="1.5" className="landing-ping" />}
              <circle cx={n.x} cy={n.y} r={n.hub ? 5 : 3.5} fill={n.hub ? "#5b8cff" : "#94a3b8"} stroke="#0b1220" strokeWidth="2" />
              <text
                x={n.x + (n.dx ?? 0)}
                y={n.y + (n.dy ?? 0)}
                textAnchor={n.anchor ?? "middle"}
                className="fill-slate-300"
                style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.01em" }}
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Карточки в стиле интерфейса (иллюстрация) */}
        <div
          className="landing-float absolute bottom-[2%] left-[1%] w-[min(15rem,58%)] rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-md sm:top-[9%] sm:right-[1%] sm:bottom-auto sm:left-auto"
          style={{ "--float-delay": "0s" } as CSSProperties}
          aria-hidden
        >
          <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 sm:justify-between">
            <span className="id-code hidden sm:inline">CF-O-000214</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 font-medium whitespace-nowrap text-blue-300">
              <span className="size-1.5 rounded-full bg-blue-400" /> В пути
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-white">
            Иу <ArrowRight className="size-3.5 text-slate-500" /> Москва
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-blue-500 to-sky-400" />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Граница пройдена · Хоргос</p>
        </div>

        <div
          className="landing-float absolute bottom-[4%] left-[2%] hidden w-[13.5rem] rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-md sm:block"
          style={{ "--float-delay": "-2.5s" } as CSSProperties}
          aria-hidden
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
            <Gavel className="size-3.5" /> Идут торги · 3 предложения
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Алматы → Ташкент</p>
          <p className="mt-0.5 text-[11px] text-slate-400">20 т · тент · загрузка завтра</p>
        </div>

        <div
          className="landing-float absolute right-[8%] bottom-[16%] hidden w-[12.5rem] rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/40 backdrop-blur-md md:block"
          style={{ "--float-delay": "-4.5s" } as CSSProperties}
          aria-hidden
        >
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            <li className="flex items-center gap-1.5">
              <CircleCheck className="size-3.5 text-emerald-400" /> Договор подписан
            </li>
            <li className="flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-emerald-400" /> CMR загружена
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-sky-400" /> Отметка водителя · 12 мин назад
            </li>
          </ul>
        </div>
      </div>
      <figcaption id="hero-visual-caption" className="mt-3 text-center text-xs text-slate-500">
        Иллюстрация: маршруты и карточки перевозок в стиле интерфейса TIRCO
      </figcaption>
    </figure>
  );
}
