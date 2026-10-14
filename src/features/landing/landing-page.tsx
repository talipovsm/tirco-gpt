import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  ChevronDown,
  CircleCheck,
  FileCheck2,
  FileSignature,
  FlaskConical,
  Gavel,
  Headset,
  Layers,
  Map,
  MessagesSquare,
  Navigation,
  Package,
  Route,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroVisual } from "./hero-visual";
import { LandingHeader } from "./landing-header";
import { LandingLogo } from "./landing-logo";
import { LANDING_SECTIONS } from "./landing-nav";
import { Reveal } from "./reveal";

/* Все утверждения ниже соответствуют реализованным функциям приложения (роли, биржа, торги, договор,
   рейс по этапам, документы, чат, автопарк, «Следующий рейс», демо-база). Без цифр и отзывов. */

const CHAIN = ["Груз", "Торги", "Договор", "Рейс", "Документы", "Расчёт"];

const AUDIENCE = [
  {
    icon: Package,
    title: "Грузоотправители",
    lead: "Разместите груз и выберите перевозчика по предложениям, а не по звонкам.",
    points: [
      "Мастер груза с маршрутом и точками",
      "Сравнение ставок и встречные предложения",
      "Подписание договора и подтверждение получения",
    ],
  },
  {
    icon: Truck,
    title: "Перевозчики и владельцы автопарков",
    lead: "Находите грузы на бирже и ведите рейсы своих машин в одном месте.",
    points: ["Биржа грузов и ставки", "Автопарк, водители и назначение на рейс", "«Следующий рейс» — грузы рядом с точкой разгрузки"],
  },
  {
    icon: Headset,
    title: "Диспетчеры",
    lead: "Операционная работа перевозчика без доступа к настройкам компании.",
    points: ["Карта операций: в пути, задержки, прибытия", "Назначение машин и водителей", "Чат по перевозке и события с приоритетами"],
  },
  {
    icon: Users,
    title: "Экспедиторы",
    lead: "Размещайте грузы от имени клиентов и контролируйте много перевозок сразу.",
    points: ["Грузы с указанием клиента", "Выбор перевозчиков из предложений", "Единый список перевозок и документов"],
  },
];

const STEPS = [
  {
    title: "Регистрация компании",
    text: "Укажите вид деятельности — грузовладелец, перевозчик или экспедитор — и данные компании. Сотрудников и водителей можно пригласить.",
  },
  {
    title: "Груз на бирже",
    text: "Грузовладелец или экспедитор создаёт груз: маршрут, даты, параметры, цена или запрос цены — и публикует его.",
  },
  {
    title: "Предложения и выбор",
    text: "Перевозчики предлагают цену, стороны могут торговаться. Принятое предложение превращается в перевозку.",
  },
  { title: "Договор", text: "Обе стороны подписывают договор на платформе. Перевозчик назначает машину и водителя." },
  {
    title: "Рейс по этапам",
    text: "Водитель отмечает этапы с телефона: загрузка, граница, разгрузка. Документы и фото прикладываются к перевозке.",
  },
  { title: "Получение и расчёт", text: "Грузовладелец подтверждает получение, перевозка закрывается, стороны оставляют отзывы." },
];

const WHY = [
  {
    icon: Layers,
    title: "Одна цепочка вместо разрозненных инструментов",
    text: "Груз, торги, договор, рейс, документы и оплаты связаны между собой — не нужно сверять таблицы, чаты и почту.",
  },
  {
    icon: Map,
    title: "Прозрачность для всех участников",
    text: "Грузовладелец, перевозчик и водитель видят один и тот же статус перевозки, этапы и документы.",
  },
  {
    icon: Bell,
    title: "Важное не теряется",
    text: "События с приоритетами: новые предложения, смены статуса, задержки, документы — с переходом к объекту.",
  },
  {
    icon: ShieldCheck,
    title: "Права по ролям",
    text: "Каждый сотрудник видит и делает то, что положено его роли: руководитель, диспетчер, водитель.",
  },
];

const FAQ = [
  {
    q: "Что такое TIRCO?",
    a: "Цифровая платформа для международных грузоперевозок: биржа грузов, торги, договор, выполнение рейса, документы и расчёты по перевозке — в одной системе.",
  },
  {
    q: "Кому подходит платформа?",
    a: "Грузовладельцам, транспортным компаниям (руководителям и диспетчерам) и экспедиторам. Водители работают в мобильной версии рейса по приглашению своей компании.",
  },
  {
    q: "Как зарегистрироваться?",
    a: "Нажмите «Регистрация», выберите вид деятельности компании и заполните данные. Затем в профиле компании можно отправить заявку на проверку — её проводит администратор платформы.",
  },
  {
    q: "Как войти в существующий аккаунт?",
    a: "Нажмите «Войти» и укажите email и пароль. Если пароль забыт, его можно восстановить со страницы входа.",
  },
  {
    q: "Можно ли попробовать без рабочих данных?",
    a: "Да. На странице входа можно выбрать демо-базу — учебные данные, которые хранятся отдельно от рабочей базы компании.",
  },
  {
    q: "Что доступно после регистрации?",
    a: "Зависит от вида деятельности: грузовладельцы и экспедиторы размещают грузы и выбирают перевозчиков; перевозчики работают с биржей, автопарком, водителями и рейсами.",
  },
  {
    q: "Как работают водители?",
    a: "Компания приглашает водителя, после чего он видит свой рейс с телефона: следующий шаг одной кнопкой, отметки местоположения, фото и документы, связь с диспетчером.",
  },
];

function SectionHead({
  id,
  eyebrow,
  title,
  text,
  tone = "light",
  align = "left",
}: {
  id: string;
  eyebrow: string;
  title: string;
  text?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-xs font-semibold tracking-[0.16em] uppercase", tone === "dark" ? "text-blue-300" : "text-primary")}>
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          "mt-3 text-3xl leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl",
          tone === "dark" ? "text-white" : "text-slate-950",
        )}
      >
        {title}
      </h2>
      {text && (
        <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", tone === "dark" ? "text-slate-300" : "text-slate-600")}>{text}</p>
      )}
    </div>
  );
}

const ctaPrimary =
  "bg-primary hover:bg-primary-hover inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white shadow-lg shadow-blue-900/30 transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";
const ctaGhostDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-base font-semibold text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";

export function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-medium text-slate-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Перейти к содержанию
      </a>
      <LandingHeader />

      <main id="main">
        {/* ── Первый экран ── */}
        <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-[#070b14] pt-16 text-white">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_32rem_at_75%_35%,rgb(29_78_216/0.28),transparent_70%),radial-gradient(40rem_24rem_at_10%_100%,rgb(245_158_11/0.10),transparent_70%)]" />
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6 lg:px-8 lg:pt-20 lg:pb-24">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Route className="size-3.5 text-blue-300" aria-hidden />
                Платформа международных грузоперевозок
              </p>
              <h1
                id="hero-title"
                className="mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]"
              >
                Грузы, перевозчики и логистика —{" "}
                <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-amber-200 bg-clip-text whitespace-nowrap text-transparent">
                  в одной системе
                </span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-300">
                Находите грузы и перевозчиков, договаривайтесь о цене, подписывайте договор и ведите перевозку до подтверждения получения —
                на единой платформе TIRCO.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={ctaPrimary}>
                  Начать работу <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/login" className={ctaGhostDark}>
                  Войти в систему
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                {["Биржа и торги", "Договор онлайн", "Рейс по этапам", "Документы перевозки"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CircleCheck className="size-4 text-emerald-400" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* ── Что такое TIRCO ── */}
        <section aria-labelledby="about-title" className="border-b border-slate-100 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:px-8">
            <Reveal>
              <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">Что такое TIRCO</p>
              <h2
                id="about-title"
                className="mt-3 text-3xl leading-[1.15] font-bold tracking-tight text-balance text-slate-950 sm:text-4xl"
              >
                Вся перевозка — от заявки до закрытия — в одной цепочке
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                Международная перевозка обычно живёт в звонках, мессенджерах, таблицах и почте. TIRCO связывает её этапы между собой: груз
                находит перевозчика, предложение становится договором, договор — рейсом, а рейс — пакетом документов и расчётом.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Платформа создана для компаний, которые возят грузы между Китаем, Казахстаном, Центральной Азией и Россией, и для тех, кто
                такие перевозки организует.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ol aria-label="Цепочка перевозки" className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CHAIN.map((c, i) => (
                  <li
                    key={c}
                    className="group relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_32px_-12px_rgb(29_78_216/0.25)]"
                  >
                    <span className="id-code text-xs font-semibold text-slate-400">0{i + 1}</span>
                    <p className="mt-6 text-lg font-semibold text-slate-900">{c}</p>
                    <span
                      className="bg-primary absolute top-5 right-5 size-2 rounded-full opacity-30 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* ── Возможности: бенто-сетка ── */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHead id="features-title" eyebrow="Возможности" title="Всё, что нужно для перевозки, — уже связано между собой" />
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
              <Reveal className="md:col-span-4">
                <FeatureCard
                  icon={Gavel}
                  title="Биржа грузов и торги"
                  text="Размещение груза через мастер с маршрутом и точками. Перевозчики предлагают цену, стороны обмениваются встречными предложениями, задают вопросы по грузу."
                >
                  <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-hidden>
                    {[
                      { name: "Перевозчик A", price: "4 500 $", tone: "slate" },
                      { name: "Перевозчик B", price: "4 200 $", tone: "blue" },
                      { name: "Перевозчик C", price: "4 650 $", tone: "slate" },
                    ].map((b) => (
                      <div
                        key={b.name}
                        className={cn(
                          "rounded-xl border p-3 text-sm",
                          b.tone === "blue" ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white",
                        )}
                      >
                        <p className="text-slate-500">{b.name}</p>
                        <p className="num mt-1 text-lg font-semibold text-slate-900">{b.price}</p>
                        {b.tone === "blue" && <p className="text-primary mt-1 text-xs font-medium">Встречное предложение</p>}
                      </div>
                    ))}
                  </div>
                </FeatureCard>
              </Reveal>
              <Reveal className="md:col-span-2" delay={80}>
                <FeatureCard
                  icon={FileSignature}
                  title="Договор на платформе"
                  text="Договор формируется из условий перевозки, обе стороны подписывают его с подтверждением паролем."
                  tone="dark"
                />
              </Reveal>
              <Reveal className="md:col-span-2">
                <FeatureCard
                  icon={Map}
                  title="Карта операций"
                  text="Перевозки в пути, задержки и прибытия на одной карте, с маршрутом и расстоянием по каждому рейсу."
                />
              </Reveal>
              <Reveal className="md:col-span-2" delay={80}>
                <FeatureCard
                  icon={FileCheck2}
                  title="Документы перевозки"
                  text="CMR, инвойс, упаковочный лист, фото груза и подтверждение доставки — с историей версий в карточке перевозки."
                >
                  <ul className="mt-5 space-y-1.5 text-sm" aria-hidden>
                    {[
                      ["CMR", true],
                      ["Инвойс", true],
                      ["Подтверждение доставки", false],
                    ].map(([n, ok]) => (
                      <li key={String(n)} className="flex items-center gap-2 text-slate-600">
                        <CircleCheck className={cn("size-4", ok ? "text-emerald-500" : "text-slate-300")} /> {n}
                      </li>
                    ))}
                  </ul>
                </FeatureCard>
              </Reveal>
              <Reveal className="md:col-span-2" delay={160}>
                <FeatureCard
                  icon={MessagesSquare}
                  title="Чат и события"
                  text="Переписка по каждой перевозке и уведомления с приоритетами: что требует действия, а что — для сведения."
                />
              </Reveal>
              <Reveal className="md:col-span-3">
                <FeatureCard
                  icon={Truck}
                  title="Автопарк и водители"
                  text="Машины, водители, назначение на рейс. Водитель получает приглашение и работает со своим рейсом с телефона."
                />
              </Reveal>
              <Reveal className="md:col-span-3" delay={80}>
                <FeatureCard
                  icon={Navigation}
                  title="«Следующий рейс»"
                  text="Подбор грузов рядом с точкой разгрузки или по пути в выбранном направлении — меньше пустого пробега."
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Для кого ── */}
        <section id="audience" aria-labelledby="audience-title" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHead
                id="audience-title"
                eyebrow="Для кого"
                title="Каждый участник перевозки работает в своей роли"
                text="Интерфейс и права зависят от роли в компании: каждый видит свои задачи и не мешает другим."
              />
            </Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
              {AUDIENCE.map((a, i) => (
                <Reveal
                  as="li"
                  key={a.title}
                  delay={i * 70}
                  className="group bg-white p-7 transition-colors duration-200 hover:bg-slate-50 sm:p-9"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <a.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">{a.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">{a.lead}</p>
                  <ul className="mt-5 space-y-2">
                    {a.points.map((p) => (
                      <li key={p} className="flex gap-2.5 text-sm text-slate-700">
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Smartphone className="size-4" aria-hidden /> Водители подключаются по приглашению своей компании и работают с рейсом с
              телефона.
            </p>
          </div>
        </section>

        {/* ── Как это работает ── */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="relative scroll-mt-20 overflow-hidden bg-[#070b14] py-20 text-white sm:py-28"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_24rem_at_100%_0%,rgb(29_78_216/0.22),transparent_70%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHead
                id="how-title"
                eyebrow="Как это работает"
                title="От регистрации до закрытой перевозки — шесть шагов"
                tone="dark"
              />
            </Reveal>
            <ol className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={(i % 3) * 90} className="relative pl-14">
                  <span className="id-code absolute top-0 left-0 grid size-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-blue-200">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span
                      className="absolute top-12 bottom-[-2.25rem] left-5 w-px bg-gradient-to-b from-white/20 to-transparent md:hidden"
                      aria-hidden
                    />
                  )}
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Почему TIRCO ── */}
        <section id="why" aria-labelledby="why-title" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <SectionHead
                id="why-title"
                eyebrow="Почему TIRCO"
                title="Меньше ручной сверки — больше контроля над перевозкой"
                text="Ценность единой системы — в связях: каждое действие оставляет след там, где его ожидают увидеть другие участники."
              />
              <Link href="/register" className={cn(ctaPrimary, "mt-8 shadow-blue-600/20")}>
                Зарегистрировать компанию <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Reveal>
            <ul className="grid gap-4">
              {WHY.map((w, i) => (
                <Reveal
                  as="li"
                  key={w.title}
                  delay={i * 70}
                  className="flex gap-5 rounded-2xl border border-slate-200 p-6 transition-[border-color,box-shadow] duration-200 hover:border-slate-300 hover:shadow-[0_10px_30px_-14px_rgb(15_23_42/0.18)]"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <w.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{w.title}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-slate-600">{w.text}</p>
                  </div>
                </Reveal>
              ))}
              <Reveal as="li" className="flex gap-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <FlaskConical className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Можно начать с демо-базы</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-slate-700">
                    При входе выберите демо-базу и пройдите сценарий на учебных данных — рабочая база компании при этом не затрагивается.
                  </p>
                </div>
              </Reveal>
            </ul>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-slate-100 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHead id="faq-title" eyebrow="FAQ" title="Частые вопросы" align="center" />
            </Reveal>
            <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 sm:px-6">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown
                      className="size-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-5 text-base leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Финальный призыв ── */}
        <section aria-labelledby="cta-title" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#070b14] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
            <svg
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60"
              viewBox="0 0 1200 420"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path d="M -20 330 Q 300 200 600 260 T 1220 120" fill="none" stroke="rgb(91 140 255 / 0.35)" strokeWidth="1.5" />
              <path d="M -20 330 Q 300 200 600 260 T 1220 120" fill="none" stroke="#7dd3fc" strokeWidth="1.5" className="landing-flow" />
              <path
                d="M -20 120 Q 400 60 700 160 T 1220 380"
                fill="none"
                stroke="rgb(245 158 11 / 0.25)"
                strokeWidth="1"
                strokeDasharray="3 8"
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_50%_0%,rgb(29_78_216/0.35),transparent_70%)]" />
            <LandingLogo className="justify-center" />
            <h2 id="cta-title" className="mx-auto mt-8 max-w-2xl text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
              Переведите перевозки в одну систему
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
              Зарегистрируйте компанию и разместите первый груз или найдите подходящий на бирже.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className={ctaPrimary}>
                Зарегистрироваться <ArrowRight className="size-4" aria-hidden />
              </Link>
              <p className="text-sm text-slate-400">
                Уже есть аккаунт?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-400"
                >
                  Войти
                </Link>
              </p>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
          <div>
            <LandingLogo tone="dark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Цифровая платформа международных грузоперевозок: грузы, перевозчики и выполнение перевозок в одной системе.
            </p>
          </div>
          <nav aria-label="Разделы сайта">
            <p className="text-sm font-semibold text-slate-950">Разделы</p>
            <ul className="mt-3 space-y-2">
              {LANDING_SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Аккаунт">
            <p className="text-sm font-semibold text-slate-950">Аккаунт</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  Вход
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  Регистрация
                </Link>
              </li>
              <li>
                <Link
                  href="/forgot-password"
                  className="text-sm text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  Восстановить пароль
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} TIRCO</p>
            <p className="flex items-center gap-1.5">
              <BadgeCheck className="size-3.5" aria-hidden /> Компании проходят проверку у администратора платформы по заявке
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  tone = "light",
  children,
}: {
  icon: typeof Building2;
  title: string;
  text: string;
  tone?: "light" | "dark";
  children?: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "group h-full rounded-3xl border p-7 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 sm:p-8",
        tone === "dark"
          ? "border-slate-800 bg-slate-950 text-white hover:shadow-[0_18px_40px_-18px_rgb(15_23_42/0.6)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_18px_40px_-20px_rgb(15_23_42/0.22)]",
      )}
    >
      <span
        className={cn(
          "grid size-11 place-items-center rounded-xl",
          tone === "dark" ? "bg-white/10 text-blue-200" : "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className={cn("mt-5 text-xl font-semibold", tone === "dark" ? "text-white" : "text-slate-950")}>{title}</h3>
      <p className={cn("mt-2 text-base leading-relaxed", tone === "dark" ? "text-slate-300" : "text-slate-600")}>{text}</p>
      {children}
    </article>
  );
}
