/**
 * Демо-стенд: публичные демо-аккаунты для входа в реальной базе (см. ensureDemoLogins).
 * Запускается из scripts/docker-start.sh при DEMO_SEED=1:
 *
 *   npm run demo:logins
 *
 * Без DEMO_SEED=1 не выполняется: на обычной реальной базе аккаунтов с общеизвестным паролем быть не должно.
 */
import "dotenv/config";
import { dbFor } from "@/lib/db/prisma";
import { ensureDemoLogins } from "@/server/services/demo-logins.service";

async function main() {
  if (process.env.DEMO_SEED !== "1") {
    console.error("[demo-logins] Только для демо-стенда (DEMO_SEED=1) — пропускаю.");
    process.exitCode = 1;
    return;
  }
  const { created, passwordReset, failed } = await ensureDemoLogins();
  const list = (xs: string[]) => (xs.length ? ` (${xs.join(", ")})` : "");
  console.log(
    `[demo-logins] Демо-аккаунты для входа: создано ${created.length}${list(created)}, ` +
      `пароль восстановлен ${passwordReset.length}${list(passwordReset)}${failed.length ? `, ошибки: ${failed.join(", ")}` : ""}.`,
  );
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("[demo-logins] Не удалось подготовить демо-аккаунты:", e);
    process.exitCode = 1;
  })
  .finally(() => dbFor("real").$disconnect());
