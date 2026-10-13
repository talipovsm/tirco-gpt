import "server-only";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { authDb } from "@/lib/db/prisma";
import { DEMO_LOGINS, DEMO_PASSWORD } from "@/lib/demo-accounts";

/**
 * Публичные демо-аккаунты в реальной базе: вход всегда проверяется по ней, а seed:demo пишет только в демо-базу.
 * Вызывается при старте демо-стенда (DEMO_SEED=1, `scripts/ensure-demo-logins.ts`). Недостающий аккаунт создаётся
 * без компаний — в демо-режиме он занимает место персонажа seed с тем же email (provisionDemoIdentity);
 * пароль, изменённый посетителем, возвращается к объявленному на странице входа. Остальное не меняется.
 */
export async function ensureDemoLogins(): Promise<{ created: string[]; passwordReset: string[] }> {
  const created: string[] = [];
  const passwordReset: string[] = [];
  for (const { email, firstName, lastName, phone } of DEMO_LOGINS) {
    const existing = await authDb.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (!existing) {
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      // Несколько контейнеров при деплое: второй вставки не будет
      const { count } = await authDb.user.createMany({ data: [{ email, firstName, lastName, phone, passwordHash }], skipDuplicates: true });
      if (count) created.push(email);
    } else if (!(await verifyPassword(DEMO_PASSWORD, existing.passwordHash))) {
      await authDb.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(DEMO_PASSWORD) } });
      passwordReset.push(email);
    }
  }
  return { created, passwordReset };
}
