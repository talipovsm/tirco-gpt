/**
 * Назначение администратора платформы в реальной базе (OPS-01). Ничего не удаляет, повторный запуск безопасен.
 *
 *   ADMIN_PASSWORD='…' npm run admin:grant -- --email admin@example.com --create --first-name Иван --last-name Петров --confirm
 *   npm run admin:grant -- --email user@example.com --confirm                 # назначить роль существующему пользователю
 *   ADMIN_PASSWORD='…' npm run admin:grant -- --email … --reset-password --confirm   # новый пароль, сессии отзываются
 *   npm run admin:grant -- --email … --revoke --confirm                      # снять роль (кроме последнего администратора)
 *
 * Пароль берётся только из переменной ADMIN_PASSWORD (не из аргументов — они попадают в историю shell и список процессов).
 */
import "dotenv/config";
import { dbFor } from "@/lib/db/prisma";
import { grantPlatformAdmin, revokePlatformAdmin } from "@/server/services/platform-admin.service";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const email = arg("email");
  if (!email) throw new Error("Укажите --email.");
  if (!flag("confirm")) {
    throw new Error("Операция меняет права в реальной базе. Повторите с флагом --confirm.");
  }
  if (flag("revoke")) {
    const r = await revokePlatformAdmin(email);
    console.log(`[admin-grant] ${email}: ${r.revoked ? "роль администратора снята, сессии отозваны" : "не является администратором"}.`);
    return;
  }
  const create = flag("create") ? { firstName: arg("first-name") ?? "", lastName: arg("last-name") ?? "" } : undefined;
  if (create && (!create.firstName || !create.lastName)) throw new Error("Для --create укажите --first-name и --last-name.");
  const r = await grantPlatformAdmin({
    email,
    password: process.env.ADMIN_PASSWORD,
    create,
    resetPassword: flag("reset-password"),
  });
  console.log(
    `[admin-grant] ${email}: ${r.created ? "создан" : r.promoted ? "назначен администратором" : "уже администратор"}` +
      `${r.passwordReset && !r.created ? ", пароль заменён, прежние сессии отозваны" : ""}.`,
  );
}

main()
  .catch((e) => {
    console.error("[admin-grant]", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => dbFor("real").$disconnect());
