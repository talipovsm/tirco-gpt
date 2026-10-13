/**
 * Демо-стенд: production с загрузкой демо-данных (DEMO_SEED=1). Его демо-аккаунты общие — пароль напечатан
 * на странице входа (у прежнего seed — и в README), поэтому они работают только с демо-базой.
 */
export function demoStand(): boolean {
  return process.env.NODE_ENV === "production" && process.env.DEMO_SEED === "1";
}

/** Демо-домен, в т.ч. прежний (CargoFlow) и поддомены генератора (`…@carriers.tirco.demo`). */
const DEMO_DOMAIN = /(@|\.)(tirco|cargoflow)\.demo$/;

/**
 * Общий демо-аккаунт демо-стенда: любой адрес демо-домена, кроме администратора платформы
 * (у него в production собственный пароль). Такой аккаунт не работает с реальной базой и не меняет пароль и профиль.
 */
export function sharedDemoAccount(email: string, platformRole: string): boolean {
  return demoStand() && DEMO_DOMAIN.test(email) && platformRole !== "PLATFORM_ADMIN";
}
