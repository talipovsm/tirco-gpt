import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/landing/landing-page";
import { getCurrentActor } from "@/lib/auth/session";
import { homePathFor } from "@/server/services/auth.service";

const TITLE = "TIRCO — цифровая платформа международных грузоперевозок";
const DESCRIPTION =
  "Грузы, перевозчики и логистика в одной системе: биржа грузов, торги, договор, выполнение рейса, документы и расчёты по перевозке.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "TIRCO",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

/**
 * Публичная главная. Посетитель без сессии видит описание платформы со ссылками на вход и регистрацию;
 * пользователь с сессией сразу попадает в свой раздел приложения (как и раньше).
 */
export default async function Home() {
  const actor = await getCurrentActor();
  if (actor) redirect(homePathFor(actor.active?.role ?? null, actor.isAdmin));
  return <LandingPage />;
}
