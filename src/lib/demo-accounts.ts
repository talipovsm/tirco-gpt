/**
 * Публичные демо-аккаунты демо-стенда: кнопки на странице входа и учётные записи, которые создаются
 * в реальной базе при старте стенда (`scripts/ensure-demo-logins.ts`). Администратора здесь нет:
 * в production у него нет общеизвестного пароля.
 */
export const DEMO_PASSWORD = "Demo1234!";

export const DEMO_ADMIN_EMAIL = "admin@tirco.demo";

/** Имена и телефоны — как у персонажей seed с тем же email. */
export const DEMO_LOGINS = [
  { label: "Грузовладелец", email: "shipper@tirco.demo", firstName: "Алия", lastName: "Демоева", phone: "+7 700 000 00 01" },
  { label: "Перевозчик", email: "carrier@tirco.demo", firstName: "Ержан", lastName: "Тестов", phone: "+7 700 000 00 02" },
  { label: "Экспедитор", email: "forwarder@tirco.demo", firstName: "Олег", lastName: "Экспедиторов", phone: "+7 900 000 00 04" },
  { label: "Водитель", email: "driver@tirco.demo", firstName: "Demo", lastName: "Driver", phone: "+7 700 000 00 05" },
  { label: "Автопарк (топливо)", email: "fleet@tirco.demo", firstName: "Азамат", lastName: "Абенов", phone: "+7 701 100 00 01" },
  { label: "Водитель Ivan", email: "ivan@tirco.demo", firstName: "Ivan", lastName: "Petrov", phone: "+7 701 100 00 02" },
] as const;

/** Email одного из публичных демо-аккаунтов (без администратора). */
export function isPublicDemoLogin(email: string): boolean {
  return DEMO_LOGINS.some((a) => a.email === email);
}
