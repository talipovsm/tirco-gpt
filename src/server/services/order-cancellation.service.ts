import "server-only";
import type { PartySide } from "@/generated/prisma/enums";
import { audit, AuditAction } from "@/lib/audit/audit";
import type { Actor } from "@/lib/auth/actor";
import { prisma, type Tx } from "@/lib/db/prisma";
import { AppError, errors } from "@/lib/errors";
import { AGREED_CANCELLABLE_STATUSES } from "@/lib/state-machine/order-state-machine";
import { requireOrderAccess } from "./access";
import { reauthenticate } from "./auth.service";
import { notify } from "./notification.service";
import { lockOrder, orderParticipantUserIds, performTransitionInTx } from "./order-core";
import { applyCancellationEffects } from "./order.service";
import { settleOnOrderCancel } from "./secure-deal.service";

/**
 * Отмена перевозки по соглашению сторон (BL-01). После подписания договора и до начала погрузки одна сторона
 * предлагает отмену с причиной, вторая соглашается (с повторным вводом пароля) или отклоняет. Переход в CANCELLED
 * выполняет система; последствия — как у обычной отмены (applyCancellationEffects), деньги безопасной сделки
 * возвращаются через провайдера. После начала погрузки — только спор или администратор.
 */

async function partySide(actor: Actor, orderId: string) {
  const { order, access } = await requireOrderAccess(actor, orderId);
  if (access.side !== "CUSTOMER" && access.side !== "CARRIER") {
    throw errors.forbidden("Отмену по соглашению согласуют заказчик и перевозчик.");
  }
  if (!access.can("ORDER_CANCEL")) throw errors.forbidden("У вас нет прав на отмену перевозки.");
  return { order, side: access.side as PartySide };
}

function assertEligible(status: string) {
  if (!(AGREED_CANCELLABLE_STATUSES as string[]).includes(status)) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      "Отменить по соглашению сторон можно после подписания договора и до начала погрузки. Позже — через спор или администратора.",
    );
  }
}

/** Ожидающее предложение; если перевозка вышла из допустимых статусов, предложение устаревает. */
async function pendingRequest(tx: Tx, orderId: string, status: string) {
  const req = await tx.orderCancellationRequest.findFirst({ where: { orderId, status: "PENDING" } });
  if (req && !(AGREED_CANCELLABLE_STATUSES as string[]).includes(status)) {
    await tx.orderCancellationRequest.update({ where: { id: req.id }, data: { status: "EXPIRED", decidedAt: new Date() } });
    return null;
  }
  return req;
}

const SIDE_LABEL: Record<PartySide, string> = { CUSTOMER: "Заказчик", CARRIER: "Перевозчик" };

export async function getCancellationRequest(actor: Actor, orderId: string) {
  const { order } = await requireOrderAccess(actor, orderId);
  const req = await prisma.orderCancellationRequest.findFirst({
    where: { orderId, status: "PENDING" },
    include: { proposedBy: { select: { firstName: true, lastName: true } } },
  });
  if (!req || !(AGREED_CANCELLABLE_STATUSES as string[]).includes(order.currentStatus)) return null;
  return req;
}

export async function proposeCancellation(actor: Actor, orderId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 3) throw errors.validation("Укажите причину отмены.", { reason: ["Укажите причину отмены"] });
  const { side } = await partySide(actor, orderId);
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.transportOrder.findUniqueOrThrow({ where: { id: orderId } });
    assertEligible(order.currentStatus);
    const existing = await pendingRequest(tx, orderId, order.currentStatus);
    if (existing) {
      throw new AppError(
        "DUPLICATE_ACTION",
        existing.proposedBySide === side
          ? "Предложение отмены уже отправлено."
          : "Другая сторона уже предложила отмену — ответьте на него.",
      );
    }
    const req = await tx.orderCancellationRequest.create({
      data: { orderId, proposedBySide: side, proposedByUserId: actor.userId, reason: text },
    });
    await audit(
      actor,
      { action: AuditAction.ORDER_CANCEL_PROPOSED, entityType: "TransportOrder", entityId: orderId, newValue: { reason: text, side } },
      tx,
    );
    await notify(tx, {
      userIds: await orderParticipantUserIds(tx, order, side === "CUSTOMER" ? { carrier: true } : { customer: true }),
      type: "STATUS_CHANGED",
      title: `${SIDE_LABEL[side]} предлагает отменить перевозку ${order.publicNumber}`,
      body: `Причина: ${text}. Согласитесь или отклоните предложение на странице перевозки.`,
      entityType: "TransportOrder",
      entityId: orderId,
      link: `/orders/${orderId}`,
    });
    return req;
  });
}

export async function withdrawCancellation(actor: Actor, orderId: string) {
  const { side } = await partySide(actor, orderId);
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.transportOrder.findUniqueOrThrow({ where: { id: orderId } });
    const req = await pendingRequest(tx, orderId, order.currentStatus);
    if (!req) throw errors.notFound("Нет действующего предложения отмены.");
    if (req.proposedBySide !== side) throw errors.forbidden("Отозвать предложение может только сторона, которая его отправила.");
    await tx.orderCancellationRequest.update({
      where: { id: req.id },
      data: { status: "WITHDRAWN", decidedAt: new Date(), decidedByUserId: actor.userId },
    });
    await audit(actor, { action: AuditAction.ORDER_CANCEL_WITHDRAWN, entityType: "TransportOrder", entityId: orderId }, tx);
    return { id: req.id, status: "WITHDRAWN" as const };
  });
}

export async function respondToCancellation(
  actor: Actor,
  orderId: string,
  input: { decision: "ACCEPT" | "REJECT"; password?: string; comment?: string | null },
) {
  const { side } = await partySide(actor, orderId);
  if (input.decision === "ACCEPT") {
    // Согласие на отмену — юридически значимое действие, как подпись договора
    if (!input.password) throw errors.validation("Введите пароль для подтверждения.", { password: ["Введите пароль"] });
    await reauthenticate(actor, input.password);
  }
  const result = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.transportOrder.findUniqueOrThrow({ where: { id: orderId } });
    const req = await pendingRequest(tx, orderId, order.currentStatus);
    if (!req) throw errors.notFound("Нет действующего предложения отмены.");
    if (req.proposedBySide === side) throw errors.forbidden("Ответить на предложение должна другая сторона.");
    const now = new Date();
    if (input.decision === "REJECT") {
      await tx.orderCancellationRequest.update({
        where: { id: req.id },
        data: { status: "REJECTED", decidedAt: now, decidedByUserId: actor.userId, decisionComment: input.comment?.trim() || null },
      });
      await audit(
        actor,
        {
          action: AuditAction.ORDER_CANCEL_REJECTED,
          entityType: "TransportOrder",
          entityId: orderId,
          newValue: { comment: input.comment ?? null },
        },
        tx,
      );
      await notify(tx, {
        userIds: [req.proposedByUserId],
        type: "STATUS_CHANGED",
        title: `Отмена перевозки ${order.publicNumber} отклонена`,
        body: input.comment?.trim() ? `Комментарий: ${input.comment.trim()}` : "Перевозка продолжается.",
        entityType: "TransportOrder",
        entityId: orderId,
        link: `/orders/${orderId}`,
      });
      return { status: "REJECTED" as const, reason: req.reason, republishedLoadId: null };
    }
    assertEligible(order.currentStatus);
    await tx.orderCancellationRequest.update({
      where: { id: req.id },
      data: { status: "ACCEPTED", decidedAt: now, decidedByUserId: actor.userId, decisionComment: input.comment?.trim() || null },
    });
    const { order: cancelled, from } = await performTransitionInTx(tx, {
      orderId,
      to: "CANCELLED",
      side: "SYSTEM",
      actor,
      source: "WEB",
      comment: `Отмена по соглашению сторон: ${req.reason}`,
    });
    // Отказался перевозчик — груз заказчика снова выставляется копией, как при отказе до подписания
    const effects = await applyCancellationEffects(tx, actor, cancelled, from, req.reason, req.proposedBySide === "CARRIER");
    return { status: "ACCEPTED" as const, reason: req.reason, republishedLoadId: effects.republishedLoadId };
  });
  if (result.status === "ACCEPTED") await settleOnOrderCancel(orderId, actor, `отмена по соглашению сторон: ${result.reason}`);
  return result;
}
