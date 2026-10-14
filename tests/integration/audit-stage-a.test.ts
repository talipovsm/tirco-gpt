import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { acceptBid, createBid } from "@/server/services/bid.service";
import { createLoad, getLoadDetail, listLoads } from "@/server/services/load.service";
import { loadListQuerySchema } from "@/lib/validation/load";
import { login } from "@/server/services/auth.service";
import { adminsWithDemoPassword, grantPlatformAdmin, revokePlatformAdmin } from "@/server/services/platform-admin.service";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";
import { actorFor, expectAppError, loadInput, makeCompany, makeUser, PASSWORD, resetDb, scene } from "./helpers";

type Scene = Awaited<ReturnType<typeof scene>>;

// Cookie-хранилище для next/headers вне сервера Next.js (вход создаёт сессию)
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "10.0.0.9" }),
}));

const PRIVATE = {
  notes: "SECRET-OWNER-NOTE",
  clientName: "Клиент экспедитора",
};

async function privateLoad(s: Scene) {
  const base = loadInput();
  return createLoad(
    s.shipper,
    {
      ...base,
      ...PRIVATE,
      stops: base.stops.map((st, i) => (i === 0 ? { ...st, contactName: "Секретный Контакт", contactPhone: "+7 777 000 99 88" } : st)),
    },
    { publish: true },
  );
}

function leaks(detail: Awaited<ReturnType<typeof getLoadDetail>>) {
  const json = JSON.stringify(detail.load);
  return {
    notes: json.includes(PRIVATE.notes),
    clientName: json.includes(PRIVATE.clientName),
    contacts: json.includes("Секретный Контакт") || json.includes("+7 777 000 99 88"),
  };
}

describe("SEC-02: приватные поля груза", () => {
  let s: Scene;
  beforeEach(async () => {
    await resetDb();
    s = await scene();
  });

  it("владелец видит всё", async () => {
    const load = await privateLoad(s);
    expect(leaks(await getLoadDetail(s.shipper, load.id))).toEqual({ notes: true, clientName: true, contacts: true });
  });

  it("перевозчик без ставки и экспедитор не видят заметки, клиента и контакты", async () => {
    const load = await privateLoad(s);
    expect(leaks(await getLoadDetail(s.carrier2, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
    const fwdCo = await makeCompany("FORWARDER", "Fwd LLP");
    const fwdUser = await makeUser({ role: "FORWARDER", companyId: fwdCo.id });
    const fwd = await actorFor(fwdUser.id, fwdCo.id);
    expect(leaks(await getLoadDetail(fwd, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
  });

  it("проигравший торги перевозчик не видит контакты, выбранный — видит контакты и клиента, но не заметки", async () => {
    const load = await privateLoad(s);
    const offer = { currency: "USD" as const, comment: null, readyDate: null, terms: null, validUntil: null };
    const win = await createBid(s.carrier, load.id, { ...offer, amount: 4000 });
    await createBid(s.carrier2, load.id, { ...offer, amount: 4100 });
    await acceptBid(s.shipper, win.id);
    expect(leaks(await getLoadDetail(s.carrier2, load.id))).toEqual({ notes: false, clientName: false, contacts: false });
    expect(leaks(await getLoadDetail(s.carrier, load.id))).toEqual({ notes: false, clientName: true, contacts: true });
  });

  it("биржа не отдаёт заметки и клиента", async () => {
    await privateLoad(s);
    const market = await listLoads(s.carrier2, loadListQuerySchema.parse({ scope: "marketplace" }));
    expect(market.items.length).toBe(1);
    expect(JSON.stringify(market.items)).not.toContain(PRIVATE.notes);
    expect(JSON.stringify(market.items)).not.toContain(PRIVATE.clientName);
    const mine = await listLoads(s.shipper, loadListQuerySchema.parse({ scope: "mine" }));
    expect(JSON.stringify(mine.items)).toContain(PRIVATE.notes);
    expect(await prisma.load.count()).toBe(1);
  });
});

describe("SEC-05: лимит входов считает только неудачные попытки", () => {
  beforeEach(async () => {
    await resetDb();
    vi.stubEnv("DISABLE_RATE_LIMIT", "0");
  });
  afterEach(() => vi.unstubAllEnvs());

  const meta = (i: number) => ({ ip: `10.1.${Math.floor(i / 200)}.${i % 200}`, userAgent: "vitest" });
  const attempt = (email: string, password: string, i: number) => login({ email, password, dataMode: "real" }, meta(i));

  it("20 успешных входов подряд не блокируют учётную запись", async () => {
    const u = await makeUser();
    for (let i = 0; i < 20; i++) await attempt(u.email, PASSWORD, i);
  });

  it("11-я неудачная попытка отклоняется лимитом, успешный вход сбрасывает счётчик", async () => {
    const u = await makeUser();
    for (let i = 0; i < 9; i++) await expectAppError(attempt(u.email, "wrong-password", i), "UNAUTHORIZED");
    await attempt(u.email, PASSWORD, 100);
    for (let i = 0; i < 10; i++) await expectAppError(attempt(u.email, "wrong-password", 200 + i), "UNAUTHORIZED");
    await expectAppError(attempt(u.email, PASSWORD, 300), "RATE_LIMITED");
  });
});

describe("SEC-01: администратор с демо-паролем в production", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("не получает сессию в production, но входит вне production", async () => {
    const admin = await makeUser({ admin: true });
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(DEMO_PASSWORD) } });
    const input = { email: admin.email, password: DEMO_PASSWORD, dataMode: "real" as const };
    await login(input, { ip: "10.2.0.1", userAgent: "vitest" });
    vi.stubEnv("NODE_ENV", "production");
    await expectAppError(login(input, { ip: "10.2.0.1", userAgent: "vitest" }), "FORBIDDEN");
  });
});

describe("OPS-01 / SEC-07: назначение администраторов платформы", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("создаёт администратора на пустой базе, повторный запуск идемпотентен, другие таблицы не меняются", async () => {
    const before = await prisma.company.count();
    const r1 = await grantPlatformAdmin({
      email: "Root@Example.com",
      password: "very-strong-pass-1",
      create: { firstName: "Иван", lastName: "Петров" },
    });
    expect(r1).toMatchObject({ created: true, promoted: true });
    const r2 = await grantPlatformAdmin({ email: "root@example.com" });
    expect(r2).toMatchObject({ created: false, promoted: false, passwordReset: false });
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "root@example.com" } });
    expect(u.platformRole).toBe("PLATFORM_ADMIN");
    expect(await prisma.company.count()).toBe(before);
    expect(await prisma.auditLog.count({ where: { entityId: u.id } })).toBe(2);
  });

  it("отклоняет короткий и демо-пароль, назначает роль существующему пользователю", async () => {
    await expect(grantPlatformAdmin({ email: "x@example.com", password: "short", create: { firstName: "a", lastName: "b" } })).rejects.toThrow();
    await expect(grantPlatformAdmin({ email: "x@example.com", password: DEMO_PASSWORD, create: { firstName: "a", lastName: "b" } })).rejects.toThrow();
    const user = await makeUser();
    expect(await grantPlatformAdmin({ email: user.email })).toMatchObject({ promoted: true, created: false });
  });

  it("последнего администратора снять нельзя, второго — можно", async () => {
    const a = await makeUser({ admin: true });
    await expect(revokePlatformAdmin(a.email)).rejects.toThrow(/последний/);
    const b = await makeUser({ admin: true });
    expect(await revokePlatformAdmin(b.email)).toMatchObject({ revoked: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).platformRole).toBe("USER");
  });

  it("находит администраторов с демо-паролем", async () => {
    const a = await makeUser({ admin: true });
    expect(await adminsWithDemoPassword()).toEqual([]);
    await prisma.user.update({ where: { id: a.id }, data: { passwordHash: await hashPassword(DEMO_PASSWORD) } });
    expect(await adminsWithDemoPassword()).toEqual([a.id]);
  });
});
