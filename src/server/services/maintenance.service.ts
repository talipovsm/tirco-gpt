import "server-only";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

const DAY = 24 * 60 * 60_000;

/**
 * Периодическое обслуживание данных (запускается вместе с плановой задачей безопасной сделки):
 *  - истёкшие планы «Следующего рейса» и топливные карты получают статус EXPIRED;
 *  - удаляются служебные записи, которые больше не нужны (ключи идемпотентности, завершённые сессии,
 *    использованные/истёкшие ссылки сброса пароля и подтверждения email, давно прочитанные уведомления);
 *  - по настроенным срокам хранения (DATA-02) — старые записи журнала аудита, трекинга и телеметрии.
 */
export async function runMaintenance(now = new Date()) {
  const [movements, cards, idempotency, sessions, resetTokens, verifyTokens, notifications] = await Promise.all([
    prisma.plannedMovement.updateMany({ where: { status: "ACTIVE", availableUntil: { lt: now } }, data: { status: "EXPIRED" } }),
    prisma.fuelCard.updateMany({
      where: { status: { in: ["ACTIVE", "BLOCKED", "SUSPENDED"] }, expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    }),
    prisma.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date(now.getTime() - 30 * DAY) } }, { revokedAt: { lt: new Date(now.getTime() - 30 * DAY) } }],
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 180 * DAY) } } }),
  ]);
  const result = {
    movementsExpired: movements.count,
    fuelCardsExpired: cards.count,
    removed: {
      idempotencyKeys: idempotency.count,
      sessions: sessions.count,
      passwordResetTokens: resetTokens.count,
      emailVerificationTokens: verifyTokens.count,
      notifications: notifications.count,
    },
    retention: await applyRetention(now),
  };
  logger.info("job.maintenance", result);
  return result;
}

/**
 * Сроки хранения журналов (DATA-02), в днях. Пусто или 0 — хранить бессрочно (по умолчанию: срок хранения
 * аудита и истории перевозок может требоваться по закону и договору, его выбирает владелец платформы).
 * Меньше MIN_RETENTION_DAYS не допускается — защита от опечатки, которая удалила бы почти всю историю.
 */
export const MIN_RETENTION_DAYS = 30;

export function retentionDays(name: "AUDIT_RETENTION_DAYS" | "TRACKING_RETENTION_DAYS" | "TELEMETRY_RETENTION_DAYS"): number | null {
  const raw = process.env[name]?.trim();
  if (!raw || raw === "0") return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS) {
    logger.warn("config.retention.invalid", { name, value: raw, min: MIN_RETENTION_DAYS });
    return null;
  }
  return days;
}

// Удаление по срокам — не чаще раза в сутки: обслуживание запускается каждые несколько минут, а чистка
// больших таблиц без индекса по дате — дорогая операция
let lastRetentionAt = 0;

export function resetRetentionScheduleForTests() {
  lastRetentionAt = 0;
}

async function applyRetention(now: Date) {
  const audit = retentionDays("AUDIT_RETENTION_DAYS");
  const tracking = retentionDays("TRACKING_RETENTION_DAYS");
  const telemetry = retentionDays("TELEMETRY_RETENTION_DAYS");
  if (!audit && !tracking && !telemetry) return null;
  if (now.getTime() - lastRetentionAt < DAY) return null;
  lastRetentionAt = now.getTime();
  const before = (days: number) => new Date(now.getTime() - days * DAY);
  const [auditLog, trackingEvents, telemetryReadings] = await Promise.all([
    audit ? prisma.auditLog.deleteMany({ where: { createdAt: { lt: before(audit) } } }) : null,
    // Трекинг удаляется только у завершённых перевозок: у идущей перевозки история нужна для споров и сроков
    tracking
      ? prisma.trackingEvent.deleteMany({
          where: { createdAt: { lt: before(tracking) }, order: { currentStatus: { in: ["CLOSED", "CANCELLED"] } } },
        })
      : null,
    telemetry ? prisma.telemetryReading.deleteMany({ where: { recordedAt: { lt: before(telemetry) } } }) : null,
  ]);
  return {
    auditLog: auditLog?.count ?? null,
    trackingEvents: trackingEvents?.count ?? null,
    telemetryReadings: telemetryReadings?.count ?? null,
  };
}
