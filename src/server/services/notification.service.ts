import "server-only";
import type { MemberRole, NotificationType } from "@/generated/prisma/enums";
import type { Actor } from "@/lib/auth/actor";
import { prisma, type Tx } from "@/lib/db/prisma";
import { errors } from "@/lib/errors";
import { externalAdapters } from "@/lib/notifications/adapters";

export type NotifyInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  link?: string;
  /** Не уведомлять инициатора действия. */
  excludeUserId?: string;
};

/**
 * In-app уведомления создаются в той же транзакции, что и бизнес-операция.
 * Очередь внешней доставки создаётся в той же транзакции. Отдельная задача видит
 * только зафиксированные записи; отправка переживает перезапуск процесса.
 */
export async function notify(tx: Tx, input: NotifyInput) {
  const recipients = [...new Set(input.userIds)].filter((id) => id && id !== input.excludeUserId);
  if (recipients.length === 0) return;
  // Один запрос: параллельные запросы в рамках транзакции на одном соединении не допускаются
  const created = await tx.notification.createManyAndReturn({
    data: recipients.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      link: input.link,
    })),
    select: { id: true },
  });
  const channels = externalAdapters.filter((adapter) => adapter.isEnabled()).map((adapter) => adapter.channel);
  if (channels.length) {
    // Same transaction as the business operation: rollback removes both in-app and external work.
    await tx.notificationDelivery.createMany({
      data: created.flatMap((notification) => channels.map((channel) => ({ notificationId: notification.id, channel }))),
      skipDuplicates: true,
    });
  }
}

/** Пользователи компании (активные участники), опционально — только с указанными ролями. */
export async function companyUserIds(tx: Tx, companyId: string | null | undefined, roles?: MemberRole[]) {
  if (!companyId) return [];
  const members = await tx.companyMember.findMany({
    where: { companyId, status: "ACTIVE", ...(roles ? { role: { in: roles } } : {}), user: { status: "ACTIVE" } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

export const CUSTOMER_ROLES: MemberRole[] = ["SHIPPER", "SHIPPER_MANAGER", "FORWARDER", "FORWARDER_MANAGER"];
export const CARRIER_OFFICE_ROLES: MemberRole[] = ["CARRIER_ADMIN", "CARRIER_DISPATCHER"];

// ───────── API для пользователя ─────────

export async function listNotifications(actor: Actor, opts: { page: number; pageSize: number; unreadOnly?: boolean }) {
  const where = { userId: actor.userId, ...(opts.unreadOnly ? { readAt: null } : {}) };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: actor.userId, readAt: null } }),
  ]);
  return { items, total, unread, page: opts.page, pageSize: opts.pageSize };
}

export async function markNotificationRead(actor: Actor, id: string) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== actor.userId) throw errors.notFound("Уведомление не найдено.");
  if (n.readAt) return n;
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(actor: Actor) {
  const res = await prisma.notification.updateMany({
    where: { userId: actor.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
