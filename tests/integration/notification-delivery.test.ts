import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithDataMode } from "@/lib/db/data-mode";
import { prisma } from "@/lib/db/prisma";
import type { NotificationAdapter } from "@/lib/notifications/adapters";
import { processNotificationDeliveries, MAX_NOTIFICATION_ATTEMPTS } from "@/server/services/notification-delivery.service";
import { notify } from "@/server/services/notification.service";
import { makeUser, resetDb } from "./helpers";

const now = new Date("2030-01-01T00:00:00Z");
const fake = (send: NotificationAdapter["send"] = vi.fn(async () => "sent" as const)): NotificationAdapter => ({
  channel: "email",
  isEnabled: () => true,
  send,
});

async function enqueue() {
  const user = await makeUser();
  await prisma.$transaction((tx) => notify(tx, { userIds: [user.id, user.id], type: "STATUS_CHANGED", title: "Рейс обновлён" }));
  return prisma.notificationDelivery.findFirstOrThrow();
}

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("EMAIL_DRIVER", "log");
});
afterEach(() => vi.unstubAllEnvs());

describe("durable external notifications", () => {
  it("commits notification and one external delivery atomically; a rollback leaves neither", async () => {
    const user = await makeUser();
    await expect(
      prisma.$transaction(async (tx) => {
        await notify(tx, { userIds: [user.id], type: "STATUS_CHANGED", title: "Rolled back" });
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await prisma.notification.count()).toBe(0);
    expect(await prisma.notificationDelivery.count()).toBe(0);
    await enqueue();
    expect(await prisma.notificationDelivery.count()).toBe(1);
  });

  it("a worker cannot see the outbox until the business transaction commits", async () => {
    const user = await makeUser();
    const adapter = fake();
    await prisma.$transaction(async (tx) => {
      await notify(tx, { userIds: [user.id], type: "STATUS_CHANGED", title: "Committed" });
      expect(await processNotificationDeliveries({ now, adapters: [adapter] })).toMatchObject({ sent: 0 });
    });
    expect(await processNotificationDeliveries({ now, adapters: [adapter] })).toMatchObject({ sent: 1 });
  });

  it("two workers claim a delivery once; completed delivery is not sent again", async () => {
    const delivery = await enqueue();
    const adapter = fake();
    const results = await Promise.all([
      processNotificationDeliveries({ now, adapters: [adapter], limit: 1 }),
      processNotificationDeliveries({ now, adapters: [adapter], limit: 1 }),
    ]);
    expect(results.reduce((sum, r) => sum + r.sent, 0)).toBe(1);
    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(adapter.send).toHaveBeenCalledWith(expect.objectContaining({ deliveryId: delivery.id }));
    await processNotificationDeliveries({ now, adapters: [adapter] });
    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it("persists failure and delayed retry; a later invocation reuses the stable delivery id", async () => {
    const delivery = await enqueue();
    const send = vi.fn<NotificationAdapter["send"]>().mockRejectedValueOnce(new Error("transport unavailable")).mockResolvedValue("sent");
    const adapters = [fake(send)];
    expect(await processNotificationDeliveries({ now, adapters })).toMatchObject({ retried: 1 });
    const pending = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(pending).toMatchObject({ status: "PENDING", attempts: 1, lockToken: null });
    expect(pending.nextAttemptAt).toEqual(new Date(now.getTime() + 30_000));
    await processNotificationDeliveries({ now: new Date(now.getTime() + 29_000), adapters });
    expect(send).toHaveBeenCalledTimes(1);
    expect(await processNotificationDeliveries({ now: pending.nextAttemptAt, adapters })).toMatchObject({ sent: 1 });
    expect(send.mock.calls.map(([n]) => n.deliveryId)).toEqual([delivery.id, delivery.id]);
  });

  it("recovers an expired claim after process restart", async () => {
    const delivery = await enqueue();
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "PROCESSING", attempts: 1, lockToken: randomUUID(), lockedUntil: new Date(now.getTime() - 1) },
    });
    expect(await processNotificationDeliveries({ now, adapters: [fake()] })).toMatchObject({ sent: 1 });
    expect(await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).toMatchObject({
      status: "SENT",
      attempts: 2,
    });
  });

  it("a late worker cannot acknowledge a claim now owned by another worker", async () => {
    const delivery = await enqueue();
    const newToken = randomUUID();
    const adapter = fake(
      vi.fn(async () => {
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { lockToken: newToken } });
        return "sent" as const;
      }),
    );
    expect(await processNotificationDeliveries({ now, adapters: [adapter], limit: 1 })).toMatchObject({ sent: 0 });
    expect(await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).toMatchObject({
      status: "PROCESSING",
      lockToken: newToken,
      sentAt: null,
    });
  });

  it("exhausted expired claims become FAILED rather than being stranded forever", async () => {
    const delivery = await enqueue();
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "PROCESSING",
        attempts: MAX_NOTIFICATION_ATTEMPTS,
        lockToken: randomUUID(),
        lockedUntil: new Date(now.getTime() - 1),
      },
    });
    const adapter = fake();
    expect(await processNotificationDeliveries({ now, adapters: [adapter] })).toMatchObject({ failed: 1 });
    expect(adapter.send).not.toHaveBeenCalled();
    expect(await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).toMatchObject({
      status: "FAILED",
      lockToken: null,
    });
  });

  it("DEMO deliveries stay in DEMO and never call an external adapter", async () => {
    await runWithDataMode("demo", async () => {
      await resetDb();
      await enqueue();
      const adapter = fake();
      expect(await processNotificationDeliveries({ now, adapters: [adapter] })).toMatchObject({ skipped: 1 });
      expect(adapter.send).not.toHaveBeenCalled();
      expect(await prisma.notificationDelivery.count({ where: { status: "SKIPPED" } })).toBe(1);
    });
    expect(await prisma.notificationDelivery.count()).toBe(0);
  });

  it("test mode never uses real adapters implicitly", async () => {
    await enqueue();
    expect(await processNotificationDeliveries({ now })).toEqual({ sent: 0, skipped: 0, retried: 0, failed: 0 });
    expect(await prisma.notificationDelivery.count({ where: { status: "PENDING" } })).toBe(1);
  });
});
