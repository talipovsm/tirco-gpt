import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { acceptBid, createBid } from "@/server/services/bid.service";
import { signContract } from "@/server/services/contract.service";
import { uploadOrderDocument } from "@/server/services/document.service";
import { createLoad } from "@/server/services/load.service";
import { assignDriver, assignVehicle, changeStatus, reportDelivered } from "@/server/services/order.service";
import { DEFAULT_SETTINGS, updateSettings } from "@/server/services/settings.service";
import { proposeCancellation, respondToCancellation, withdrawCancellation } from "@/server/services/order-cancellation.service";
import { cancelOrder } from "@/server/services/order.service";
import { expectAppError, loadInput, PASSWORD, pdfFile, resetDb, scene } from "./helpers";

type Scene = Awaited<ReturnType<typeof scene>>;
const bidInput = (amount = 3000) => ({ amount, currency: "USD" as const, comment: null, readyDate: null, terms: null, validUntil: null });

async function signedOrder(s: Scene) {
  const load = await createLoad(s.shipper, loadInput(), { publish: true });
  const bid = await createBid(s.carrier, load.id, bidInput());
  const { orderId, contractId } = await acceptBid(s.shipper, bid.id);
  const c = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });
  await signContract(s.shipper, contractId, { password: PASSWORD, documentHash: c.contentHash });
  await signContract(s.carrier, contractId, { password: PASSWORD, documentHash: c.contentHash });
  return { orderId, loadId: load.id, bidId: bid.id };
}

async function toAtDelivery(s: Scene, orderId: string) {
  await assignVehicle(s.carrier, orderId, s.vehicle.id);
  await assignDriver(s.carrier, orderId, s.driver.id);
  for (const status of ["AT_LOADING", "LOADED", "IN_TRANSIT", "AT_DELIVERY"] as const) {
    await changeStatus(s.driverActor, orderId, { status, comment: null, documentIds: [] });
  }
}

describe("BL-05: подтверждение при отметке «Доставлено»", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });
  afterEach(async () => {
    await updateSettings(s.admin, DEFAULT_SETTINGS);
  });

  it("по умолчанию доставку можно отметить без документов", async () => {
    const { orderId } = await signedOrder(s);
    await toAtDelivery(s, orderId);
    await reportDelivered(s.driverActor, orderId, { comment: null, documentIds: [] });
  });

  it("с настройкой — только с фото груза, POD или CMR", async () => {
    await updateSettings(s.admin, { ...DEFAULT_SETTINGS, requireProofOnDelivery: true });
    const { orderId } = await signedOrder(s);
    await toAtDelivery(s, orderId);
    await expectAppError(reportDelivered(s.driverActor, orderId, { comment: null, documentIds: [] }), "DELIVERY_NOT_ALLOWED");
    const pod = await uploadOrderDocument(s.driverActor, orderId, { type: "PROOF_OF_DELIVERY", file: pdfFile("pod.pdf") });
    const done = await reportDelivered(s.driverActor, orderId, { comment: null, documentIds: [pod.id] });
    expect(done.currentStatus).toBe("DELIVERED");
  });
});

describe("DATA-01: файлы демо-базы отдельно от реальных", () => {
  it("ключи загрузок в демо-режиме под префиксом demo/uploads/, в реальном — без него", async () => {
    const { runWithDataMode } = await import("@/lib/db/data-mode");
    const { buildStorageKey, DEMO_UPLOADS_PREFIX, storage } = await import("@/lib/storage/storage");
    expect(buildStorageKey("orders/x", ".pdf")).toMatch(/^orders\/x\//);
    const demoKey = await runWithDataMode("demo", async () => buildStorageKey("orders/x", ".pdf"));
    expect(demoKey.startsWith(DEMO_UPLOADS_PREFIX)).toBe(true);

    const realKey = buildStorageKey("orders/x", ".pdf");
    await storage().put(realKey, Buffer.from("real"), "application/pdf");
    await storage().put(demoKey, Buffer.from("demo"), "application/pdf");
    await storage().deletePrefix(DEMO_UPLOADS_PREFIX);
    expect((await storage().get(realKey)).toString()).toBe("real");
    await expect(storage().get(demoKey)).rejects.toThrow();
  });
});

describe("BL-01: отмена по соглашению сторон", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("после подписания сторона не может отменить одна, но может по согласию второй", async () => {
    const { orderId, loadId } = await signedOrder(s);
    await expectAppError(cancelOrder(s.shipper, orderId, "передумали"), "INVALID_STATE_TRANSITION");
    await proposeCancellation(s.shipper, orderId, "Груз не готов к отгрузке");
    await expectAppError(proposeCancellation(s.shipper, orderId, "ещё раз"), "DUPLICATE_ACTION");
    // предложившая сторона не может согласиться сама
    await expectAppError(respondToCancellation(s.shipper, orderId, { decision: "ACCEPT", password: PASSWORD }), "FORBIDDEN");
    // неверный пароль — согласие не принимается
    await expectAppError(respondToCancellation(s.carrier, orderId, { decision: "ACCEPT", password: "wrong-pass" }), "FORBIDDEN");
    const r = await respondToCancellation(s.carrier, orderId, { decision: "ACCEPT", password: PASSWORD });
    expect(r.status).toBe("ACCEPTED");
    expect(r.republishedLoadId).toBeNull();
    expect((await prisma.transportOrder.findUniqueOrThrow({ where: { id: orderId } })).currentStatus).toBe("CANCELLED");
    expect((await prisma.load.findUniqueOrThrow({ where: { id: loadId } })).status).toBe("CANCELLED");
    const history = await prisma.transportOrderStatusHistory.findFirstOrThrow({ where: { orderId, toStatus: "CANCELLED" } });
    expect(history.actorType).toBe("SYSTEM");
  });

  it("отказ перевозчика по соглашению выставляет груз заново; отклонение и отзыв не отменяют перевозку", async () => {
    const { orderId } = await signedOrder(s);
    await proposeCancellation(s.carrier, orderId, "Машина сломалась");
    await respondToCancellation(s.shipper, orderId, { decision: "REJECT", comment: "Найдите замену" });
    expect((await prisma.transportOrder.findUniqueOrThrow({ where: { id: orderId } })).currentStatus).toBe("CONTRACT_SIGNED");
    await proposeCancellation(s.carrier, orderId, "Машина сломалась");
    await withdrawCancellation(s.carrier, orderId);
    await proposeCancellation(s.carrier, orderId, "Машина сломалась окончательно");
    const r = await respondToCancellation(s.shipper, orderId, { decision: "ACCEPT", password: PASSWORD });
    expect(r.republishedLoadId).not.toBeNull();
    expect((await prisma.load.findUniqueOrThrow({ where: { id: r.republishedLoadId! } })).status).toBe("PUBLISHED");
  });

  it("после начала погрузки отмена по соглашению недоступна, ожидающее предложение устаревает", async () => {
    const { orderId } = await signedOrder(s);
    await assignVehicle(s.carrier, orderId, s.vehicle.id);
    await assignDriver(s.carrier, orderId, s.driver.id);
    await proposeCancellation(s.shipper, orderId, "Передумали");
    await changeStatus(s.driverActor, orderId, { status: "AT_LOADING", comment: null, documentIds: [] });
    await expectAppError(respondToCancellation(s.carrier, orderId, { decision: "ACCEPT", password: PASSWORD }), "NOT_FOUND");
    await expectAppError(proposeCancellation(s.shipper, orderId, "Передумали"), "INVALID_STATE_TRANSITION");
    // водитель не участвует в согласовании
    await expectAppError(proposeCancellation(s.driverActor, orderId, "Не поеду"), "FORBIDDEN");
  });
});
