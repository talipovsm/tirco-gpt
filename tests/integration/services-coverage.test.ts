import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { driverSchema, vehicleSchema } from "@/lib/validation/company";
import {
  adminGetUser,
  adminHoldOrder,
  adminListAudit,
  adminListCompanies,
  adminListDocuments,
  adminListLoads,
  adminListUsers,
  adminSetUserStatus,
  adminStats,
  adminVerificationQueue,
} from "@/server/services/admin.service";
import { acceptBid, createBid } from "@/server/services/bid.service";
import { listMessages, listThreads, sendMessage, unreadForOrder, unreadMessagesTotal } from "@/server/services/chat.service";
import {
  createDriver,
  createVehicle,
  deleteVehicle,
  listDrivers,
  listVehicles,
  updateDriver,
  updateVehicle,
} from "@/server/services/fleet.service";
import { createLoad } from "@/server/services/load.service";
import { resetRetentionScheduleForTests, retentionDays, runMaintenance } from "@/server/services/maintenance.service";
import { globalSearch } from "@/server/services/search.service";
import { expectAppError, loadInput, makeUser, resetDb, scene } from "./helpers";

type Scene = Awaited<ReturnType<typeof scene>>;
const page = { page: 1, pageSize: 20 };
const bidInput = { amount: 3000, currency: "USD" as const, comment: null, readyDate: null, terms: null, validUntil: null };

async function newOrder(s: Scene) {
  const load = await createLoad(s.shipper, loadInput(), { publish: true });
  const bid = await createBid(s.carrier, load.id, bidInput);
  const { orderId } = await acceptBid(s.shipper, bid.id);
  return { orderId, loadId: load.id };
}

describe("Админка (QA-01)", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("сводка, списки и журнал доступны администратору и закрыты для остальных", async () => {
    await newOrder(s);
    const stats = await adminStats(s.admin);
    expect(stats).toBeTruthy();
    expect((await adminListUsers(s.admin, { ...page })).total).toBeGreaterThanOrEqual(5);
    expect((await adminListUsers(s.admin, { ...page, q: "User" })).items.length).toBeGreaterThan(0);
    expect((await adminListCompanies(s.admin, { ...page, type: "CARRIER" })).items.length).toBe(2);
    expect((await adminListLoads(s.admin, { ...page })).total).toBe(1);
    expect((await adminListDocuments(s.admin, { ...page })).items).toBeDefined();
    expect((await adminListAudit(s.admin, { ...page })).total).toBeGreaterThan(0);
    expect(await adminVerificationQueue(s.admin)).toBeDefined();
    await expectAppError(adminStats(s.shipper), "FORBIDDEN");
    await expectAppError(adminListUsers(s.carrier, { ...page }), "FORBIDDEN");
  });

  it("блокировка: сессии отзываются, себя заблокировать нельзя, повтор — ошибка", async () => {
    const user = await makeUser();
    await prisma.session.create({
      data: { userId: user.id, tokenHash: `h-${user.id}`, expiresAt: new Date(Date.now() + 86_400_000), lastSeenAt: new Date() },
    });
    await adminSetUserStatus(s.admin, user.id, "BLOCK", "нарушение");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("BLOCKED");
    expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    await expectAppError(adminSetUserStatus(s.admin, user.id, "BLOCK", null), "DUPLICATE_ACTION");
    await adminSetUserStatus(s.admin, user.id, "UNBLOCK", null);
    await expectAppError(adminSetUserStatus(s.admin, s.admin.userId, "BLOCK", null), "FORBIDDEN");
    const detail = await adminGetUser(s.admin, user.id);
    expect(detail.user.id).toBe(user.id);
    expect(await prisma.auditLog.count({ where: { entityId: user.id, action: { in: ["USER_BLOCKED", "USER_UNBLOCKED"] } } })).toBe(2);
  });

  it("пауза перевозки и возобновление", async () => {
    const { orderId } = await newOrder(s);
    await adminHoldOrder(s.admin, orderId, true, "проверка документов");
    expect((await prisma.transportOrder.findUniqueOrThrow({ where: { id: orderId } })).currentStatus).toBe("ON_HOLD");
    await adminHoldOrder(s.admin, orderId, false, null);
    expect((await prisma.transportOrder.findUniqueOrThrow({ where: { id: orderId } })).currentStatus).not.toBe("ON_HOLD");
    await expectAppError(adminHoldOrder(s.shipper, orderId, true, null), "FORBIDDEN");
  });
});

describe("Чат перевозки (QA-01)", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("сообщения, непрочитанное и изоляция", async () => {
    const { orderId } = await newOrder(s);
    await sendMessage(s.shipper, orderId, { message: "Когда подача машины?" });
    expect(await unreadForOrder(s.carrier, orderId)).toBe(1);
    expect(await unreadMessagesTotal(s.carrier)).toBe(1);
    const msgs = await listMessages(s.carrier, orderId, { limit: 50 });
    expect(JSON.stringify(msgs)).toContain("Когда подача машины?");
    expect(await unreadForOrder(s.carrier, orderId)).toBe(0);
    const threads = await listThreads(s.carrier, { page: 1, pageSize: 20 });
    expect(threads.items.length).toBe(1);
    await expectAppError(sendMessage(s.carrier2, orderId, { message: "чужой" }), "FORBIDDEN");
    await expectAppError(listMessages(s.carrier2, orderId, { limit: 10 }), "FORBIDDEN");
  });

  it("PERF-01: опрос без новых сообщений ничего не пишет", async () => {
    const { orderId } = await newOrder(s);
    expect((await listMessages(s.carrier, orderId, { limit: 50 })).items).toEqual([]);
    expect(await prisma.chatReadState.count({ where: { userId: s.carrier.userId } })).toBe(0);

    await sendMessage(s.shipper, orderId, { message: "Первое" });
    await listMessages(s.carrier, orderId, { limit: 50 });
    const first = await prisma.chatReadState.findFirstOrThrow({ where: { userId: s.carrier.userId } });
    await new Promise((r) => setTimeout(r, 20));
    await listMessages(s.carrier, orderId, { limit: 50 });
    await listMessages(s.carrier, orderId, { limit: 50, after: new Date().toISOString() });
    const again = await prisma.chatReadState.findFirstOrThrow({ where: { userId: s.carrier.userId } });
    expect(again.updatedAt.getTime()).toBe(first.updatedAt.getTime());
    // Свои сообщения не требуют отметки прочтения
    await sendMessage(s.carrier, orderId, { message: "Ответ" });
    await listMessages(s.carrier, orderId, { limit: 50 });
    expect((await prisma.chatReadState.findFirstOrThrow({ where: { userId: s.carrier.userId } })).updatedAt.getTime()).toBe(
      first.updatedAt.getTime(),
    );
    // Новое сообщение другой стороны — отметка обновляется
    await sendMessage(s.shipper, orderId, { message: "Второе" });
    expect(await unreadMessagesTotal(s.carrier)).toBe(1);
    await listMessages(s.carrier, orderId, { limit: 50 });
    expect(await unreadMessagesTotal(s.carrier)).toBe(0);
    expect(await unreadMessagesTotal(s.shipper)).toBe(1);
  });
});

describe("Автопарк (QA-01)", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("машины: создание, правка, дубликат госномера, удаление и чужая компания", async () => {
    const input = vehicleSchema.parse({
      plateNumber: "kz 777 aa",
      country: "KZ",
      make: "Scania",
      model: "R450",
      vehicleType: "TRACTOR_TRAILER",
      bodyType: "REFRIGERATOR",
      capacityKg: 20000,
    });
    const v = await createVehicle(s.carrier, input);
    expect(v.plateNumber).toBe("KZ 777 AA");
    await expectAppError(createVehicle(s.carrier, input), "VALIDATION_ERROR");
    await updateVehicle(s.carrier, v.id, { ...input, model: "R500" });
    expect((await listVehicles(s.carrier, { q: "777", ...page })).items.map((x) => x.model)).toContain("R500");
    await expectAppError(updateVehicle(s.carrier2, v.id, { ...input, model: "X" }), "NOT_FOUND");
    await expectAppError(createVehicle(s.shipper, input), "FORBIDDEN");
    await deleteVehicle(s.carrier, v.id);
    expect((await listVehicles(s.carrier, { q: "777", ...page })).items.length).toBe(0);
  });

  it("SEC-10: госномер уникален в компании, совпадение с другой компанией — в журнал, а не отказ", async () => {
    const input = vehicleSchema.parse({
      plateNumber: "KZ 555 SQ",
      country: "KZ",
      make: "Volvo",
      model: "FH",
      vehicleType: "TRACTOR_TRAILER",
      bodyType: "CURTAINSIDER",
      capacityKg: 20000,
    });
    const squatter = await createVehicle(s.carrier2, input);
    const owner = await createVehicle(s.carrier, input);
    expect(owner.companyId).not.toBe(squatter.companyId);
    const shared = await prisma.auditLog.findFirstOrThrow({ where: { action: "VEHICLE_PLATE_SHARED", entityId: owner.id } });
    expect(JSON.stringify(shared.newValue)).toContain(squatter.companyId);
    await expectAppError(createVehicle(s.carrier, input), "VALIDATION_ERROR");
    expect(await prisma.auditLog.count({ where: { action: "VEHICLE_PLATE_SHARED", entityId: squatter.id } })).toBe(0);
  });

  it("водители: создание, правка, поиск", async () => {
    const input = driverSchema.parse({
      fullName: "Иван Петров",
      phone: "+7 700 123 45 67",
      licenseNumber: "AB123456",
      licenseCategory: "CE",
    });
    const { driver: d } = await createDriver(s.carrier, input);
    await updateDriver(s.carrier, d.id, { ...input, licenseCategory: "C" });
    const list = await listDrivers(s.carrier, { q: "Петров", ...page });
    expect(list.items[0].licenseCategory).toBe("C");
    await expectAppError(updateDriver(s.carrier2, d.id, input), "NOT_FOUND");
  });
});

describe("Поиск и обслуживание (QA-01)", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("глобальный поиск находит свой груз и не показывает чужие перевозки", async () => {
    const { loadId } = await newOrder(s);
    const load = await prisma.load.findUniqueOrThrow({ where: { id: loadId } });
    const mine = await globalSearch(s.shipper, load.publicNumber);
    expect(JSON.stringify(mine)).toContain(load.publicNumber);
    const other = await globalSearch(s.carrier2, load.publicNumber);
    expect(JSON.stringify(other)).not.toContain('"orders":[{');
  });

  it("обслуживание удаляет устаревшие служебные записи и не трогает актуальные", async () => {
    const u = await makeUser();
    const old = new Date(Date.now() - 400 * 86_400_000);
    await prisma.passwordResetToken.create({ data: { userId: u.id, tokenHash: `old-${u.id}`, expiresAt: old } });
    await prisma.passwordResetToken.create({
      data: { userId: u.id, tokenHash: `new-${u.id}`, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const r = await runMaintenance(new Date());
    expect(r).toBeTruthy();
    expect(await prisma.passwordResetToken.count({ where: { userId: u.id } })).toBe(1);
  });

  it("DATA-02: сроки хранения — по настройке, история идущей перевозки не удаляется", async () => {
    const { orderId: closedId } = await newOrder(s);
    const { orderId: activeId } = await newOrder(s);
    await prisma.transportOrder.update({ where: { id: closedId }, data: { currentStatus: "CLOSED" } });
    const old = new Date(Date.now() - 400 * 86_400_000);
    const tracking = (orderId: string) =>
      prisma.trackingEvent.create({ data: { orderId, type: "MANUAL_LOCATION", source: "WEB", createdAt: old, recordedAt: old } });
    await tracking(closedId);
    await tracking(activeId);
    const oldAudit = await prisma.auditLog.create({ data: { action: "TEST_OLD", entityType: "Test", createdAt: old } });
    await prisma.telemetryReading.create({ data: { vehicleId: s.vehicle.id, source: "GPS_TRACKER", provider: "demo", recordedAt: old } });

    // Без настройки ничего не удаляется
    resetRetentionScheduleForTests();
    expect((await runMaintenance(new Date())).retention).toBeNull();
    expect(await prisma.trackingEvent.count({ where: { createdAt: old } })).toBe(2);

    vi.stubEnv("AUDIT_RETENTION_DAYS", "365");
    vi.stubEnv("TRACKING_RETENTION_DAYS", "365");
    vi.stubEnv("TELEMETRY_RETENTION_DAYS", "90");
    try {
      const r = await runMaintenance(new Date());
      expect(r.retention).toEqual({ auditLog: 1, trackingEvents: 1, telemetryReadings: 1 });
      expect(await prisma.auditLog.count({ where: { id: oldAudit.id } })).toBe(0);
      expect(await prisma.trackingEvent.count({ where: { orderId: activeId, createdAt: old } })).toBe(1);
      // Повтор в те же сутки не запускает чистку
      expect((await runMaintenance(new Date())).retention).toBeNull();
      // Слишком короткий срок (опечатка) игнорируется
      vi.stubEnv("AUDIT_RETENTION_DAYS", "7");
      expect(retentionDays("AUDIT_RETENTION_DAYS")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      resetRetentionScheduleForTests();
    }
  });
});
