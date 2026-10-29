import "server-only";
import { randomUUID } from "node:crypto";
import { currentDataMode } from "@/lib/db/data-mode";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { externalAdapters, type NotificationAdapter } from "@/lib/notifications/adapters";

export const MAX_NOTIFICATION_ATTEMPTS = 8;
const LEASE_MS = 5 * 60_000;

export function notificationRetryDelay(attempt: number): number {
  return Math.min(6 * 60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

/**
 * Runs outside business transactions. A short SKIP LOCKED claim commits before any network I/O.
 * A lease survives process crashes; its token prevents a late worker from completing another claim.
 * External delivery is at-least-once, not exactly-once (SMTP acceptance and DB commit are not atomic).
 */
export async function processNotificationDeliveries(
  options: { limit?: number; now?: Date; adapters?: readonly NotificationAdapter[] } = {},
) {
  const result = { sent: 0, skipped: 0, retried: 0, failed: 0 };
  // Only explicitly supplied fake adapters may run in unit/integration tests.
  if (process.env.NODE_ENV === "test" && !options.adapters) return result;
  const adapters = options.adapters ?? externalAdapters;
  const clock = () => options.now ?? new Date();
  const started = Date.now();
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));

  const exhausted = await prisma.notificationDelivery.updateMany({
    where: { status: "PROCESSING", attempts: { gte: MAX_NOTIFICATION_ATTEMPTS }, lockedUntil: { lte: clock() } },
    data: { status: "FAILED", lockToken: null, lockedUntil: null, lastError: "attempts_exhausted_after_restart" },
  });
  result.failed += exhausted.count;

  for (let i = 0; i < limit && Date.now() - started < 20_000; i++) {
    const now = clock();
    const token = randomUUID();
    const [claimed] = await prisma.$queryRaw<{ id: string }[]>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationDelivery"
        WHERE "attempts" < ${MAX_NOTIFICATION_ATTEMPTS}
          AND (("status" = 'PENDING' AND "nextAttemptAt" <= ${now})
            OR ("status" = 'PROCESSING' AND "lockedUntil" <= ${now}))
        ORDER BY "nextAttemptAt", "createdAt", "id"
        FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationDelivery" AS d
      SET "status" = 'PROCESSING', "attempts" = d."attempts" + 1,
          "lockToken" = ${token}::uuid, "lockedUntil" = ${new Date(now.getTime() + LEASE_MS)}, "updatedAt" = ${now}
      FROM candidate WHERE d."id" = candidate."id" RETURNING d."id"`;
    if (!claimed) break;
    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: claimed.id },
      include: { notification: { include: { user: true } } },
    });
    if (!delivery || delivery.lockToken !== token) continue;
    const owned = { id: delivery.id, status: "PROCESSING" as const, lockToken: token };
    try {
      const n = delivery.notification;
      const adapter = adapters.find((a) => a.channel === delivery.channel);
      let outcome: "sent" | "skipped";
      // DEMO mirrors real email addresses: it must never send external messages.
      if (currentDataMode() === "demo" || n.user.deletedAt || n.user.status !== "ACTIVE") {
        outcome = "skipped";
      } else {
        if (!adapter?.isEnabled()) throw new Error("Notification channel is unavailable");
        outcome = await adapter.send({
          deliveryId: delivery.id,
          userId: n.userId,
          email: n.user.email,
          phone: n.user.phone,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
        });
      }
      const saved = await prisma.notificationDelivery.updateMany({
        where: owned,
        data: {
          status: outcome === "sent" ? "SENT" : "SKIPPED",
          sentAt: outcome === "sent" ? clock() : null,
          lockedUntil: null,
          lockToken: null,
          lastError: null,
        },
      });
      if (saved.count) result[outcome]++;
    } catch (error) {
      const failed = delivery.attempts >= MAX_NOTIFICATION_ATTEMPTS;
      const saved = await prisma.notificationDelivery.updateMany({
        where: owned,
        data: {
          status: failed ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(clock().getTime() + notificationRetryDelay(delivery.attempts)),
          lockedUntil: null,
          lockToken: null,
          // No provider error text or personal data in the queue.
          lastError: "delivery_failed",
        },
      });
      if (saved.count) result[failed ? "failed" : "retried"]++;
      logger.warn("notification.delivery_failed", {
        deliveryId: delivery.id,
        channel: delivery.channel,
        attempts: delivery.attempts,
        error,
      });
    }
  }
  return result;
}
