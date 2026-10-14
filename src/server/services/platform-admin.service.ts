import { AuditAction } from "@/lib/audit/actions";
import { audit } from "@/lib/audit/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { authDb } from "@/lib/db/prisma";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";

/** Минимальная длина пароля администратора платформы, назначаемого скриптом. */
export const ADMIN_PASSWORD_MIN = 12;

export type GrantAdminInput = {
  email: string;
  /** Новый пароль (обязателен при создании пользователя и при --reset-password). */
  password?: string;
  create?: { firstName: string; lastName: string };
  resetPassword?: boolean;
};

export type GrantAdminResult = { userId: string; created: boolean; promoted: boolean; passwordReset: boolean };

function checkPassword(password: string | undefined): string {
  if (!password || password.length < ADMIN_PASSWORD_MIN) {
    throw new Error(`Пароль администратора: не короче ${ADMIN_PASSWORD_MIN} символов (переменная ADMIN_PASSWORD).`);
  }
  if (password === DEMO_PASSWORD) throw new Error("Демо-пароль нельзя использовать для администратора платформы.");
  return password;
}

/**
 * Назначает роль администратора платформы (OPS-01). Работает только с реальной базой (authDb),
 * ничего не удаляет; повторный запуск идемпотентен. При смене пароля отзывает сессии пользователя.
 */
export async function grantPlatformAdmin(input: GrantAdminInput): Promise<GrantAdminResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Укажите корректный email (--email).");

  const existing = await authDb.user.findUnique({ where: { email } });
  if (!existing) {
    if (!input.create) throw new Error(`Пользователь ${email} не найден. Добавьте --create --first-name … --last-name …, чтобы создать его.`);
    const passwordHash = await hashPassword(checkPassword(input.password));
    const user = await authDb.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.create.firstName,
        lastName: input.create.lastName,
        platformRole: "PLATFORM_ADMIN",
        status: "ACTIVE",
      },
    });
    await audit(null, {
      action: AuditAction.USER_REGISTERED,
      entityType: "User",
      entityId: user.id,
      newValue: { platformRole: "PLATFORM_ADMIN", via: "admin:grant" },
    }, authDb);
    return { userId: user.id, created: true, promoted: true, passwordReset: true };
  }

  const promoted = existing.platformRole !== "PLATFORM_ADMIN";
  const data: { platformRole: "PLATFORM_ADMIN"; status: "ACTIVE"; passwordHash?: string } = {
    platformRole: "PLATFORM_ADMIN",
    status: "ACTIVE",
  };
  if (input.resetPassword) data.passwordHash = await hashPassword(checkPassword(input.password));
  await authDb.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.id }, data });
    if (input.resetPassword) {
      await tx.session.updateMany({ where: { userId: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await audit(
      null,
      {
        action: AuditAction.USER_UPDATED,
        entityType: "User",
        entityId: existing.id,
        oldValue: { platformRole: existing.platformRole, status: existing.status },
        newValue: { platformRole: "PLATFORM_ADMIN", status: "ACTIVE", passwordReset: !!input.resetPassword, via: "admin:grant" },
      },
      tx,
    );
  });
  return { userId: existing.id, created: false, promoted, passwordReset: !!input.resetPassword };
}

/** Снимает роль администратора платформы; последнего активного администратора снять нельзя (SEC-07). */
export async function revokePlatformAdmin(emailRaw: string): Promise<{ userId: string; revoked: boolean }> {
  const email = emailRaw.trim().toLowerCase();
  const user = await authDb.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Пользователь ${email} не найден.`);
  if (user.platformRole !== "PLATFORM_ADMIN") return { userId: user.id, revoked: false };
  return authDb.$transaction(async (tx) => {
    const others = await tx.user.count({
      where: { platformRole: "PLATFORM_ADMIN", status: "ACTIVE", deletedAt: null, id: { not: user.id } },
    });
    if (others === 0) throw new Error("Это последний активный администратор платформы — сначала назначьте другого.");
    await tx.user.update({ where: { id: user.id }, data: { platformRole: "USER" } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(
      null,
      {
        action: AuditAction.USER_UPDATED,
        entityType: "User",
        entityId: user.id,
        oldValue: { platformRole: "PLATFORM_ADMIN" },
        newValue: { platformRole: "USER", via: "admin:grant --revoke" },
      },
      tx,
    );
    return { userId: user.id, revoked: true };
  });
}

/** Активные администраторы платформы, у которых пароль совпадает с общеизвестным демо-паролем (SEC-01). */
export async function adminsWithDemoPassword(): Promise<string[]> {
  const admins = await authDb.user.findMany({
    where: { platformRole: "PLATFORM_ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  const result: string[] = [];
  for (const a of admins) if (await verifyPassword(DEMO_PASSWORD, a.passwordHash)) result.push(a.id);
  return result;
}
