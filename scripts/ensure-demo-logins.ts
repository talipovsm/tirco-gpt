/**
 * Демо-стенд: публичные демо-аккаунты для входа в реальной базе (см. ensureDemoLogins).
 * Запускается из scripts/docker-start.sh при DEMO_SEED=1:
 *
 *   npm run demo:logins
 */
import "dotenv/config";
import { dbFor } from "@/lib/db/prisma";
import { ensureDemoLogins } from "@/server/services/demo-logins.service";

ensureDemoLogins()
  .then(({ created, passwordReset }) => {
    console.log(
      `[demo-logins] Демо-аккаунты для входа: создано ${created.length}${created.length ? ` (${created.join(", ")})` : ""}, ` +
        `пароль восстановлен ${passwordReset.length}${passwordReset.length ? ` (${passwordReset.join(", ")})` : ""}.`,
    );
  })
  .catch((e) => {
    console.error("[demo-logins] Не удалось подготовить демо-аккаунты:", e);
    process.exitCode = 1;
  })
  .finally(() => dbFor("real").$disconnect());
