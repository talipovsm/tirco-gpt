import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCheck2,
  Gavel,
  Headset,
  Layers3,
  MapPinned,
  Package,
  Route,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "./hero-visual";
import { LandingHeader } from "./landing-header";
import { LandingLogo } from "./landing-logo";

const FEATURES = [
  {
    icon: Package,
    number: "01",
    title: "Груз находит перевозчика",
    text: "Опишите маршрут, условия и груз. Сравните предложения и согласуйте цену на платформе.",
  },
  {
    icon: MapPinned,
    number: "02",
    title: "Перевозка под контролем",
    text: "Назначайте машину и водителя. Следите за этапами рейса, местоположением и событиями.",
  },
  {
    icon: FileCheck2,
    number: "03",
    title: "Документы рядом с рейсом",
    text: "Договор, фотографии и подтверждение доставки сохраняются в общей истории перевозки.",
  },
];
const ROLES = [
  { icon: Package, title: "Грузовладельцу", text: "Опубликовать груз, выбрать предложение и контролировать доставку." },
  { icon: Truck, title: "Перевозчику", text: "Находить грузы, управлять автопарком и планировать следующие рейсы." },
  { icon: Headset, title: "Диспетчеру", text: "Видеть текущие рейсы, назначать ресурсы и решать вопросы по перевозкам." },
  { icon: Users, title: "Экспедитору", text: "Организовывать перевозки для клиентов и работать с перевозчиками в одной системе." },
];
const PROCESS = [
  { icon: Package, title: "Разместите груз", text: "Маршрут, даты и требования — в одном мастере." },
  { icon: Gavel, title: "Согласуйте условия", text: "Сравните ставки, выберите перевозчика и подпишите договор." },
  { icon: Route, title: "Проведите рейс", text: "Назначьте машину и водителя, получайте отметки по этапам." },
  { icon: FileCheck2, title: "Подтвердите доставку", text: "Соберите документы, подтвердите получение и закройте перевозку." },
];
const FAQ = [
  {
    q: "Что такое Tirco?",
    a: "Tirco связывает участников международной автоперевозки: от публикации груза и выбора перевозчика до договора, доставки и закрытия перевозки.",
  },
  {
    q: "Как начать работу?",
    a: "Создайте аккаунт, выберите вид деятельности и заполните данные компании. Затем можно разместить груз или перейти к бирже и автопарку.",
  },
  {
    q: "Можно ли сначала познакомиться с платформой?",
    a: "Да. На странице входа можно выбрать демо-базу. Учебные данные отделены от реальных перевозок компании.",
  },
  {
    q: "Как работает водитель?",
    a: "Водителя приглашает компания. В своём интерфейсе он видит назначенный рейс, отмечает этапы и передаёт фотографии, документы и геолокацию.",
  },
  {
    q: "Для каких направлений подходит Tirco?",
    a: "Основной контекст платформы — перевозки между Китаем, Казахстаном, Россией и Центральной Азией. Маршрут можно составить с несколькими точками загрузки, транзита и доставки.",
  },
];
const primaryLink =
  "inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-[#dcf57b] px-6 text-[15px] font-semibold text-[#111c2e] transition-colors hover:bg-[#e6ff8d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dcf57b]";
const eyebrow = "text-xs font-semibold tracking-[0.14em] text-[#2854d9] uppercase";
const heading = "mt-4 text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-[40px]";

export function LandingPage() {
  return (
    <div className="bg-[#f4f6fa] text-[#111c2e]">
      <a href="#main" className="sr-only fixed top-3 left-3 z-50 rounded-xl bg-white px-5 py-3 text-sm font-semibold focus:not-sr-only">
        Перейти к содержанию
      </a>
      <LandingHeader />
      <main id="main">
        <section className="overflow-hidden bg-[#111c2e] text-white" aria-labelledby="hero-title">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.06fr] lg:gap-14 lg:py-24">
            <div>
              <p className="mb-7 flex items-center gap-2.5 text-xs font-semibold tracking-[0.14em] text-[#dcf57b] uppercase">
                <span className="size-1.5 shrink-0 rounded-full bg-[#dcf57b]" />
                Международная логистика, собранная вместе
              </p>
              <h1
                id="hero-title"
                className="max-w-2xl text-[40px] leading-[1.07] font-semibold tracking-[-0.045em] text-balance sm:text-[52px] lg:text-[60px]"
              >
                Грузы, перевозчики и логистика <span className="text-[#dcf57b]">в одном рабочем пространстве.</span>
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-[#bcc8d9] sm:text-lg">
                От первого предложения до подтверждения доставки. Свяжите команду, документы и каждый этап перевозки в Tirco.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={primaryLink}>
                  Начать работу <ArrowUpRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-13 items-center justify-center gap-3 rounded-xl border border-[#455369] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/5"
                >
                  Войти в систему <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#a9b7cc]">
                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#dcf57b]" aria-hidden />
                  Для всей команды
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#dcf57b]" aria-hidden />
                  Рабочая и демо-базы
                </span>
                <span className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#dcf57b]" aria-hidden />
                  Доступ с телефона
                </span>
              </div>
            </div>
            <HeroVisual />
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-6 text-sm sm:px-8">
              <span className="text-[#8e9eb5]">Соединяем направления</span>
              <span className="font-medium">Китай</span>
              <span className="text-[#dcf57b]" aria-hidden>
                ↗
              </span>
              <span className="font-medium">Казахстан</span>
              <span className="text-[#dcf57b]" aria-hidden>
                ↗
              </span>
              <span className="font-medium">Центральная Азия</span>
              <span className="text-[#dcf57b]" aria-hidden>
                ↗
              </span>
              <span className="font-medium">Россия</span>
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-5 md:grid-cols-2 md:items-end">
            <div>
              <p className={eyebrow}>Платформа</p>
              <h2 id="features-title" className={heading}>
                Вся перевозка.
                <br />
                Одна связанная история.
              </h2>
            </div>
            <p className="max-w-lg text-base leading-7 text-[#5b6b80]">
              У каждого рейса есть маршрут, договорённости и люди. Tirco помогает держать их в одном контексте — на каждом этапе работы.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.number} className="rounded-2xl border border-[#dfe5ee] bg-white p-7">
                <div className="mb-12 flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-[#edf1ff] text-[#2854d9]">
                    <feature.icon className="size-6" strokeWidth={1.7} aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-[#7a899d]">{feature.number}</span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5b6b80]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="border-y border-[#dfe5ee] bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className={eyebrow}>Как это работает</p>
              <h2 id="how-title" className={heading}>
                От заявки
                <br />
                до закрытого рейса.
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#5b6b80]">
                Последовательный процесс с понятным следующим действием для каждого участника.
              </p>
              <Link href="/register" className="mt-7 inline-flex items-center gap-3 rounded-lg py-2 text-sm font-semibold text-[#2854d9]">
                Создать первую перевозку <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ol>
              {PROCESS.map((step, i) => (
                <li key={step.title} className="flex gap-5 border-b border-[#e7ecf2] py-5 first:pt-0 last:border-0 last:pb-0">
                  <span className="mt-1 grid size-11 shrink-0 place-items-center rounded-xl bg-[#f1f4fa] text-[#2854d9]">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#7a899d]">Шаг 0{i + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-7 text-[#5b6b80]">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="audience" aria-labelledby="audience-title" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className={eyebrow}>Для кого</p>
              <h2 id="audience-title" className={heading}>
                Общее пространство.
                <br />
                Своя роль для каждого.
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-7 text-[#5b6b80]">
              Команда работает с одной перевозкой. Доступ и действия зависят от роли участника.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <article key={role.title} className="rounded-2xl border border-[#dfe5ee] bg-white p-6">
                <role.icon className="mb-7 size-6 text-[#2854d9]" strokeWidth={1.7} aria-hidden />
                <h3 className="text-lg font-semibold">{role.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6b80]">{role.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="why" aria-labelledby="why-title" className="mx-5 rounded-2xl bg-[#111c2e] text-white sm:mx-8">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12 lg:py-20">
            <div>
              <span className="mb-6 inline-flex rounded-xl bg-[#dcf57b] p-3 text-[#111c2e]">
                <Layers3 className="size-6" aria-hidden />
              </span>
              <h2 id="why-title" className="text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-[40px]">
                Детали не теряются
                <br />
                между участниками.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#bcc8d9]">
                Обсуждение, документы и события остаются внутри перевозки. Найти нужное можно по рейсу, а не по десяткам переписок.
              </p>
            </div>
            <div className="space-y-6">
              {[
                { icon: ShieldCheck, title: "Права и история действий", text: "Разделение доступа по ролям и журнал изменений." },
                { icon: Smartphone, title: "Водитель включён в процесс", text: "Этапы рейса, фотографии и документы с телефона." },
                { icon: Truck, title: "Работа продолжается после разгрузки", text: "Подбор следующего груза по дальнейшему направлению." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <item.icon className="mt-1 size-5 shrink-0 text-[#dcf57b]" aria-hidden />
                  <div>
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#bcc8d9]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-24"
        >
          <div>
            <p className={eyebrow}>FAQ</p>
            <h2 id="faq-title" className={heading}>
              Перед стартом.
            </h2>
            <p className="mt-4 max-w-xs text-[15px] leading-7 text-[#5b6b80]">Ответы на вопросы о платформе и первых шагах.</p>
          </div>
          <div className="divide-y divide-[#dfe5ee]">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5 first:pt-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="size-4 shrink-0 text-[#7a899d] transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[#5b6b80]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#dcf57b]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[40px]">
                Дайте перевозкам
                <br />
                единое рабочее пространство.
              </h2>
              <p className="mt-4 text-[15px] text-[#405227]">Начните с компании и первого груза.</p>
            </div>
            <Link
              href="/register"
              className="inline-flex h-13 items-center gap-5 rounded-xl bg-[#111c2e] px-7 text-[15px] font-semibold text-white hover:bg-[#25374f]"
            >
              Создать аккаунт <ArrowUpRight className="size-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <footer className="bg-[#111c2e] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-7 px-5 py-10 sm:px-8">
          <LandingLogo />
          <p className="text-sm text-[#a9b7cc]">Рабочее пространство международной логистики.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="text-[#c4cddb] hover:text-white">
              Вход
            </Link>
            <Link href="/register" className="text-[#c4cddb] hover:text-white">
              Регистрация
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
