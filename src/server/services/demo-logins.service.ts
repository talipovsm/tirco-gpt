import "server-only";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { authDb } from "@/lib/db/prisma";
import { DEMO_LOGINS, DEMO_PASSWORD } from "@/lib/demo-accounts";

/**
 * Публичные демо-аккаунты в реальной базе: вход всегда проверяется по ней, а seed:demo пишет только в демо-базу.
 * Вызывается при старте демо-стенда (DEMO_SEED=1, `scripts/ensure-demo-logins.ts`). Недостающий аккаунт создаётся
 * без компаний — в демо-режиме он занимает место персонажа seed с тем же email (provisionDemoIdentity);
 * обычному пользователю, если пароль изменён, возвращается объявленный на странице входа. Остальное не меняется.
 */
export async function ensureDemoLogins(): Promise<{ created: string[]; passwordReset: string[]; failed: string[] }> {
  const created: string[] = [];
  const passwordReset: string[] = [];
  const failed: string[] = [];
  for (const { email, firstName, lastName, phone } of DEMO_LOGINS) {
    try {
      const existing = await authDb.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, platformRole: true } });
      if (!existing) {
        const passwordHash = await hashPassword(DEMO_PASSWORD);
        // Несколько контейнеров при деплое: второй вставки не будет
        const { count } = await authDb.user.createMany({
          data: [{ email, firstName, lastName, phone, passwordHash }],
          skipDuplicates: true,
        });
        if (count) created.push(email);
      } else if (existing.platformRole === "USER" && !(await verifyPassword(DEMO_PASSWORD, existing.passwordHash))) {
        await authDb.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(DEMO_PASSWORD) } });
        passwordReset.push(email);
      }
    } catch (e) {
      console.error(`[demo-logins] ${email}:`, e);
      failed.push(email);
    }
  }
  return { created, passwordReset, failed };
}
