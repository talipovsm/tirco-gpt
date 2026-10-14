import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import pg from "pg";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentActor, SESSION_COOKIE } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/permissions";
import { runWithDataMode } from "@/lib/db/data-mode";
import { DEMO_SEED_LOCK, dataModeConfig } from "@/lib/db/data-mode-config";
import { authDb, dbFor, prisma } from "@/lib/db/prisma";
import { DEMO_ADMIN_EMAIL, DEMO_LOGINS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { ensureDemoLogins } from "@/server/services/demo-logins.service";
import { DEMO_ANCHORS } from "@/server/services/demo-workspace.service";
import type { CompanyType } from "@/generated/prisma/enums";
import { POST as dataModePOST } from "@/app/api/auth/data-mode/route";
import { POST as passwordPOST } from "@/app/api/auth/password/route";
import { POST as inviteAcceptPOST } from "@/app/api/auth/invite/accept/route";
import { PATCH as profilePATCH } from "@/app/api/auth/profile/route";
import { generateToken, sha256 } from "@/lib/auth/tokens";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { GET as loadGET } from "@/app/api/loads/[id]/route";
import { GET as loadsGET, POST as loadsPOST } from "@/app/api/loads/route";
import { loadInput, makeCompany, makeUser, PASSWORD, resetDb } from "./helpers";

// Cookie-хранилище «браузера» и заголовки запроса для next/headers вне сервера Next.js
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "10.0.0.9" }),
}));

const demo = dbFor("demo");

function req(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function call<P extends Record<string, string>>(
  handler: (r: NextRequest, c: { params: Promise<P> }) => Promise<Response>,
  r: NextRequest,
  params?: P,
) {
  const res = await handler(r, { params: Promise.resolve(params ?? ({} as P)) });
  return { status: res.status, json: (await res.json()) as { success: boolean; data?: never; error?: { code: string } } };
}

async function signIn(email: string, dataMode?: "real" | "demo") {
  jar.clear();
  return call(loginPOST, req("/api/auth/login", { method: "POST", body: { email, password: PASSWORD, dataMode } }));
}

async function sessionRow() {
  const sessions = await authDb.session.findMany({ where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 1 });
  return sessions[0];
}

/** Ключевые демо-компании (в демо-базе их создаёт seed:demo). */
async function seedDemoAnchors() {
  await runWithDataMode("demo", async () => {
    await resetDb();
    const anchors: [keyof typeof DEMO_ANCHORS, CompanyType][] = [
      ["SHIPPER", "SHIPPER"],
      ["CARRIER", "CARRIER"],
      ["FORWARDER", "FORWARDER"],
    ];
    for (const [key, type] of anchors) {
      const c = await makeCompany(type, `Demo ${key}`);
      await prisma.company.update({ where: { id: c.id }, data: { registrationNumber: DEMO_ANCHORS[key] } });
    }
  });
}

let shipperEmail = "";
let adminEmail = "";
let blockedEmail = "";

beforeAll(async () => {
  await resetDb();
  await runWithDataMode("demo", resetDb);
});

beforeEach(async () => {
  jar.clear();
  await resetDb();
  const shipperCo = await makeCompany("SHIPPER", "Real Shipper LLP");
  shipperEmail = (await makeUser({ role: "SHIPPER", companyId: shipperCo.id })).email;
  adminEmail = (await makeUser({ admin: true })).email;
  blockedEmail = (await makeUser({ role: "SHIPPER", companyId: shipperCo.id })).email;
  await seedDemoAnchors();
});

describe("Режимы данных: вход и сессия", () => {
  it("по умолчанию вход в реальную базу; режим хранится в серверной сессии", async () => {
    const res = await signIn(shipperEmail);
    expect(res.status).toBe(200);
    expect((await sessionRow()).dataMode).toBe("REAL");
    expect((await getCurrentActor())?.dataMode).toBe("real");
  });

  it("вход в демо: те же учётные данные, сессия DEMO, роль сохраняется, пароль в демо-базе не хранится", async () => {
    const res = await signIn(shipperEmail, "demo");
    expect(res.status).toBe(200);
    expect((await sessionRow()).dataMode).toBe("DEMO");
    const actor = await getCurrentActor();
    expect(actor?.dataMode).toBe("demo");
    expect(actor?.active?.role).toBe("SHIPPER");
    expect(actor?.active?.companyId).toBe(
      (await demo.company.findFirstOrThrow({ where: { registrationNumber: DEMO_ANCHORS.SHIPPER } })).id,
    );
    const mirror = await demo.user.findFirstOrThrow({ where: { email: shipperEmail } });
    expect(mirror.passwordHash.startsWith("$")).toBe(false);
  });

  it("при первом входе в демо пользователь получает ленту уведомлений персонажа с той же ролью", async () => {
    await runWithDataMode("demo", async () => {
      const anchor = await prisma.company.findFirstOrThrow({ where: { registrationNumber: DEMO_ANCHORS.SHIPPER } });
      const persona = await makeUser({ role: "SHIPPER", companyId: anchor.id });
      await prisma.notification.createMany({
        data: [
          { userId: persona.id, type: "SYSTEM", title: "Новая ставка" },
          { userId: persona.id, type: "SYSTEM", title: "Груз доставлен", readAt: new Date() },
        ],
      });
    });
    await signIn(shipperEmail, "demo");
    const actor = await getCurrentActor();
    const feed = await demo.notification.findMany({ where: { userId: actor!.userId } });
    expect(feed.map((n) => n.title).sort()).toEqual(["Груз доставлен", "Новая ставка"]);
    expect(feed.filter((n) => !n.readAt)).toHaveLength(1);
    expect(await authDb.notification.count({ where: { userId: actor!.userId } })).toBe(0);
  });

  it("демо недоступно, пока демо-база не загружена (503), а не тихий вход в реальную", async () => {
    await runWithDataMode("demo", resetDb);
    const res = await signIn(shipperEmail, "demo");
    expect(res.status).toBe(503);
    expect(res.json.error?.code).toBe("SERVICE_UNAVAILABLE");
    expect(await authDb.session.count()).toBe(0);
  });

  it("неверный режим в теле входа отклоняется валидацией", async () => {
    jar.clear();
    const res = await call(
      loginPOST,
      req("/api/auth/login", { method: "POST", body: { email: shipperEmail, password: PASSWORD, dataMode: "prod" } }),
    );
    expect(res.status).toBe(422);
    expect(res.json.error?.code).toBe("VALIDATION_ERROR");
  });

  it("неверный пароль не входит ни в один режим", async () => {
    jar.clear();
    const res = await call(
      loginPOST,
      req("/api/auth/login", { method: "POST", body: { email: shipperEmail, password: "wrong-pass1", dataMode: "demo" } }),
    );
    expect(res.status).toBe(401);
    expect(await demo.user.count({ where: { email: shipperEmail } })).toBe(0);
  });
});

describe("Режимы данных: изоляция и атаки на режим", () => {
  it("груз, созданный в демо, есть только в демо-базе — даже если клиент подставляет режим real", async () => {
    await signIn(shipperEmail, "demo");
    const tampered = req("/api/loads", {
      method: "POST",
      body: { load: loadInput({ title: "Демо-груз" }), publish: false, dataMode: "real" },
      headers: { "x-data-mode": "real", cookie: "tirco_data_mode=real" },
    });
    const res = await call(loadsPOST, tampered);
    expect(res.status).toBe(201);
    expect(await demo.load.count({ where: { title: "Демо-груз" } })).toBe(1);
    expect(await authDb.load.count({ where: { title: "Демо-груз" } })).toBe(0);
  });

  it("объект реальной базы недоступен из демо-сессии по id и наоборот", async () => {
    await signIn(shipperEmail, "real");
    const real = await call(loadsPOST, req("/api/loads", { method: "POST", body: { load: loadInput({ title: "Реальный груз" }) } }));
    const realId = (real.json.data as unknown as { id: string }).id;
    expect((await call(loadGET, req(`/api/loads/${realId}`), { id: realId })).status).toBe(200);

    await signIn(shipperEmail, "demo");
    const demoRes = await call(loadsPOST, req("/api/loads", { method: "POST", body: { load: loadInput({ title: "Демо-груз" }) } }));
    const demoId = (demoRes.json.data as unknown as { id: string }).id;
    expect(
      (await call(loadGET, req(`/api/loads/${realId}?dataMode=real`, { headers: { "x-data-mode": "real" } }), { id: realId })).status,
    ).toBe(404);
    expect((await call(loadGET, req(`/api/loads/${demoId}`), { id: demoId })).status).toBe(200);

    await signIn(shipperEmail, "real");
    expect((await call(loadGET, req(`/api/loads/${demoId}`), { id: demoId })).status).toBe(404);
  });

  it("PERF-04: сессия читается из базы один раз на API-запрос", async () => {
    await signIn(shipperEmail, "demo");
    const spy = vi.spyOn(authDb.session, "findUnique");
    try {
      // Ответ (200 или 403 по правам роли) не важен: важно, что актор найден и сессия не перечитывалась
      expect((await call(loadsGET, req("/api/loads"))).status).not.toBe(401);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("подделанный токен сессии не даёт доступа ни к одному режиму", async () => {
    jar.set(SESSION_COOKIE, "forged-token");
    const res = await call(loadsGET, req("/api/loads"));
    expect(res.status).toBe(401);
  });

  it("роль платформы берётся из реальной identity: правка демо-базы не делает пользователя админом", async () => {
    await signIn(shipperEmail, "demo");
    await demo.user.updateMany({ where: { email: shipperEmail }, data: { platformRole: "PLATFORM_ADMIN" } });
    const actor = await getCurrentActor();
    expect(actor?.isAdmin).toBe(false);
    expect([...(actor?.permissions ?? [])].sort()).toEqual([...permissionsForRole("SHIPPER")].sort());
  });

  it("администратор остаётся администратором в демо-режиме", async () => {
    await signIn(adminEmail, "demo");
    const actor = await getCurrentActor();
    expect(actor?.dataMode).toBe("demo");
    expect(actor?.isAdmin).toBe(true);
  });

  it("блокировка в реальной базе действует и в демо-сессии", async () => {
    await signIn(blockedEmail, "demo");
    expect(await getCurrentActor()).not.toBeNull();
    await authDb.user.update({ where: { email: blockedEmail }, data: { status: "BLOCKED" } });
    expect(await getCurrentActor()).toBeNull();
  });

  it("переключение режима выдаёт новую сессию и отзывает прежнюю", async () => {
    await signIn(shipperEmail, "real");
    const before = await sessionRow();
    const oldToken = jar.get(SESSION_COOKIE);
    const res = await call(dataModePOST, req("/api/auth/data-mode", { method: "POST", body: { dataMode: "demo" } }));
    expect(res.status).toBe(200);
    expect(jar.get(SESSION_COOKIE)).not.toBe(oldToken);
    expect((await authDb.session.findUniqueOrThrow({ where: { id: before.id } })).revokedAt).not.toBeNull();
    expect((await sessionRow()).dataMode).toBe("DEMO");
    expect((await getCurrentActor())?.dataMode).toBe("demo");
  });

  it("переключение без сессии запрещено", async () => {
    jar.clear();
    const res = await call(dataModePOST, req("/api/auth/data-mode", { method: "POST", body: { dataMode: "demo" } }));
    expect(res.status).toBe(401);
  });

  it("демо-база пересоздана после входа — рабочее пространство восстанавливается автоматически", async () => {
    await signIn(shipperEmail, "demo");
    await seedDemoAnchors();
    const actor = await getCurrentActor();
    expect(actor?.dataMode).toBe("demo");
    expect(actor?.active?.role).toBe("SHIPPER");
  });

  /** Держит advisory-lock загрузки демо-данных, как seed:demo, пока выполняется fn. */
  async function whileDemoSeedRuns(fn: () => Promise<void>) {
    const lock = new pg.Client({ connectionString: dataModeConfig("demo").connectionString });
    await lock.connect();
    try {
      await lock.query("SELECT pg_advisory_lock($1)", [DEMO_SEED_LOCK]);
      await fn();
    } finally {
      await lock.end();
    }
  }

  it("вход в демо во время загрузки демо-данных — 503, демо-база не трогается; после загрузки — вход", async () => {
    await whileDemoSeedRuns(async () => {
      const res = await signIn(shipperEmail, "demo");
      expect(res.status).toBe(503);
      expect(res.json.error?.code).toBe("SERVICE_UNAVAILABLE");
      expect(await demo.user.count({ where: { email: shipperEmail } })).toBe(0);
      expect(await authDb.session.count()).toBe(0);
    });
    expect((await signIn(shipperEmail, "demo")).status).toBe(200);
  });

  it("демо-база пересоздаётся (идёт загрузка) — сессия не теряется и восстанавливается после загрузки", async () => {
    await signIn(shipperEmail, "demo");
    await seedDemoAnchors();
    await whileDemoSeedRuns(async () => {
      expect(await getCurrentActor()).toBeNull();
      expect(await demo.companyMember.count()).toBe(0);
    });
    expect((await sessionRow()).revokedAt).toBeNull();
    expect((await getCurrentActor())?.active?.role).toBe("SHIPPER");
  });
});

describe("seed:demo не запускается против реальной базы", () => {
  function runSeed(demoUrl: string) {
    try {
      execFileSync("npx", ["tsx", "--conditions=react-server", "prisma/seed-demo.ts"], {
        env: { ...process.env, DEMO_DATABASE_URL: demoUrl },
        stdio: "pipe",
      });
      return { code: 0, stderr: "" };
    } catch (e) {
      const err = e as { status: number; stderr: Buffer };
      return { code: err.status, stderr: err.stderr.toString() };
    }
  }

  it("DEMO_DATABASE_URL = DATABASE_URL → остановка", async () => {
    const before = await authDb.user.count();
    const r = runSeed(process.env.DATABASE_URL!);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("ERROR: Demo seed can only run against DEMO database.");
    expect(await authDb.user.count()).toBe(before);
  }, 60_000);

  it("схема без метки tirco:demo → остановка", async () => {
    await authDb.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS tirco_unmarked_test`);
    try {
      const u = new URL(process.env.DATABASE_URL!);
      u.searchParams.set("schema", "tirco_unmarked_test");
      const r = runSeed(u.toString());
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("ERROR: Demo seed can only run against DEMO database.");
    } finally {
      await authDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS tirco_unmarked_test CASCADE`);
    }
  }, 60_000);
});

describe("Демо-аккаунт без компаний в реальной базе", () => {
  it("в демо занимает место своего персонажа: компания, роль, профиль водителя, переход в кабинет водителя", async () => {
    const email = `driver-${Date.now()}@tirco.demo`;
    const real = await makeUser();
    await authDb.user.update({ where: { id: real.id }, data: { email } });
    const { companyId, driverId } = await runWithDataMode("demo", async () => {
      const carrier = await makeCompany("CARRIER", "Persona Carrier");
      const persona = await makeUser({ role: "DRIVER", companyId: carrier.id });
      await prisma.user.update({ where: { id: persona.id }, data: { email } });
      const driver = await prisma.driverProfile.create({
        data: {
          userId: persona.id,
          companyId: carrier.id,
          fullName: "Persona",
          phone: "+7 700 0",
          licenseNumber: "P1",
          licenseCategory: "CE",
        },
      });
      return { companyId: carrier.id, driverId: driver.id };
    });

    const res = await signIn(email, "demo");
    expect((res.json.data as unknown as { redirectTo: string }).redirectTo).toBe("/driver");
    const actor = await getCurrentActor();
    expect(actor?.active?.companyId).toBe(companyId);
    expect(actor?.active?.role).toBe("DRIVER");
    expect((await demo.driverProfile.findUniqueOrThrow({ where: { id: driverId } })).userId).toBe(real.id);
    // В реальной базе по-прежнему ни компаний, ни профилей
    expect(await authDb.companyMember.count({ where: { userId: real.id } })).toBe(0);

    // Повторный вход (персонаж уже вытеснен) — то же рабочее место
    await signIn(email, "demo");
    expect((await getCurrentActor())?.active?.companyId).toBe(companyId);
  });
});

describe("Удаление демо-данных из реальной базы", () => {
  function purge(...args: string[]) {
    return execFileSync("npx", ["tsx", "--conditions=react-server", "scripts/purge-demo-from-real.ts", ...args], {
      env: process.env,
      encoding: "utf8",
    });
  }

  it("удаляет демо-компании с данными, сохраняет учётные записи демо-аккаунтов и реальные данные", async () => {
    const demoCo = await makeCompany("SHIPPER", "Demo Co");
    await authDb.company.update({ where: { id: demoCo.id }, data: { registrationNumber: "DEMO-KZ-900001" } });
    const demoUser = await makeUser({ role: "SHIPPER", companyId: demoCo.id });
    const demoEmail = `shipper-${Date.now()}@tirco.demo`;
    await authDb.user.update({ where: { id: demoUser.id }, data: { email: demoEmail } });
    await authDb.notification.create({ data: { userId: demoUser.id, type: "SYSTEM", title: "demo" } });

    // DEMO- номер, но с реальным участником — не трогаем
    const mixedCo = await makeCompany("CARRIER", "Mixed Co");
    await authDb.company.update({ where: { id: mixedCo.id }, data: { registrationNumber: "DEMO-KZ-900002" } });
    await makeUser({ role: "CARRIER_ADMIN", companyId: mixedCo.id });

    await signIn(demoEmail, "real");
    await call(loadsPOST, req("/api/loads", { method: "POST", body: { load: loadInput({ title: "Демо в реальной" }) } }));
    await signIn(shipperEmail, "real");
    await call(loadsPOST, req("/api/loads", { method: "POST", body: { load: loadInput({ title: "Настоящий груз" }) } }));

    const dry = purge();
    expect(dry).toContain("сухой прогон");
    expect(await authDb.load.count({ where: { title: "Демо в реальной" } })).toBe(1);

    purge("--apply");
    expect(await authDb.load.count({ where: { title: "Демо в реальной" } })).toBe(0);
    expect(await authDb.company.count({ where: { id: demoCo.id } })).toBe(0);
    expect(await authDb.notification.count({ where: { userId: demoUser.id } })).toBe(0);
    expect(await authDb.user.count({ where: { id: demoUser.id } })).toBe(1);
    expect(await authDb.load.count({ where: { title: "Настоящий груз" } })).toBe(1);
    expect(await authDb.company.count({ where: { id: mixedCo.id } })).toBe(1);

    expect(purge("--apply")).toContain("нечего удалять");
  }, 120_000);
});

describe("Демо-стенд: демо-аккаунты для входа в реальной базе", () => {
  const demoEmails = DEMO_LOGINS.map((a) => a.email);

  async function signInDemo(email: string) {
    jar.clear();
    return call(loginPOST, req("/api/auth/login", { method: "POST", body: { email, password: DEMO_PASSWORD, dataMode: "demo" } }));
  }

  it("создаёт недостающие аккаунты без компаний; в демо аккаунт занимает место персонажа seed", async () => {
    // Персонаж seed в демо-базе (его создаёт seed:demo)
    await runWithDataMode("demo", async () => {
      const anchor = await prisma.company.findFirstOrThrow({ where: { registrationNumber: DEMO_ANCHORS.SHIPPER } });
      const persona = await makeUser({ role: "SHIPPER", companyId: anchor.id });
      await prisma.user.update({ where: { id: persona.id }, data: { email: "shipper@tirco.demo" } });
    });
    expect((await signInDemo("shipper@tirco.demo")).status).toBe(401);

    const result = await ensureDemoLogins();
    expect(result).toEqual({ created: demoEmails, passwordReset: [], failed: [] });
    const users = await authDb.user.findMany({ where: { email: { in: demoEmails } }, include: { memberships: true } });
    expect(users).toHaveLength(demoEmails.length);
    expect(users.every((u) => u.platformRole === "USER" && u.memberships.length === 0)).toBe(true);
    expect(await authDb.user.count({ where: { email: DEMO_ADMIN_EMAIL } })).toBe(0);

    const res = await signInDemo("shipper@tirco.demo");
    expect(res.status).toBe(200);
    expect((res.json.data as unknown as { role: string }).role).toBe("SHIPPER");
  });

  it("повторный запуск ничего не меняет; пароль, изменённый посетителем, возвращается к объявленному", async () => {
    await ensureDemoLogins();
    const before = await authDb.user.findMany({ where: { email: { in: demoEmails } }, orderBy: { email: "asc" } });
    expect(await ensureDemoLogins()).toEqual({ created: [], passwordReset: [], failed: [] });
    expect(await authDb.user.findMany({ where: { email: { in: demoEmails } }, orderBy: { email: "asc" } })).toEqual(before);

    await authDb.user.update({ where: { email: "carrier@tirco.demo" }, data: { passwordHash: await hashPassword("Changed12345") } });
    const realBefore = await authDb.user.findUniqueOrThrow({ where: { email: shipperEmail } });
    expect(await ensureDemoLogins()).toEqual({ created: [], passwordReset: ["carrier@tirco.demo"], failed: [] });
    const carrier = await authDb.user.findUniqueOrThrow({ where: { email: "carrier@tirco.demo" } });
    expect(await verifyPassword(DEMO_PASSWORD, carrier.passwordHash)).toBe(true);
    expect(await authDb.user.findUniqueOrThrow({ where: { email: shipperEmail } })).toEqual(realBefore);

    // Пароль администратора платформы с тем же email не сбрасывается на общеизвестный
    const adminHash = await hashPassword("OperatorSecret123");
    await authDb.user.update({
      where: { email: "forwarder@tirco.demo" },
      data: { platformRole: "PLATFORM_ADMIN", passwordHash: adminHash },
    });
    expect(await ensureDemoLogins()).toEqual({ created: [], passwordReset: [], failed: [] });
    expect((await authDb.user.findUniqueOrThrow({ where: { email: "forwarder@tirco.demo" } })).passwordHash).toBe(adminHash);
  });

  describe("на демо-стенде (production, DEMO_SEED=1)", () => {
    beforeEach(async () => {
      await ensureDemoLogins();
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DEMO_SEED", "1");
    });
    afterEach(() => vi.unstubAllEnvs());

    async function signInAs(email: string, dataMode: "real" | "demo", password = DEMO_PASSWORD) {
      jar.clear();
      return call(loginPOST, req("/api/auth/login", { method: "POST", body: { email, password, dataMode } }));
    }

    it("общий демо-аккаунт входит только в демо-базу и не переключается в реальную", async () => {
      const res = await signInAs("carrier@tirco.demo", "real");
      expect(res.status).toBe(200);
      expect((res.json.data as unknown as { dataMode: string }).dataMode).toBe("demo");
      expect((await sessionRow()).dataMode).toBe("DEMO");

      const sw = await call(dataModePOST, req("/api/auth/data-mode", { method: "POST", body: { dataMode: "real" } }));
      expect(sw.status).toBe(403);
      expect((await sessionRow()).dataMode).toBe("DEMO");
    });

    it("пароль и профиль общего демо-аккаунта не меняются", async () => {
      await signInAs("carrier@tirco.demo", "demo");
      const before = await authDb.user.findUniqueOrThrow({ where: { email: "carrier@tirco.demo" } });
      const pw = await call(
        passwordPOST,
        req("/api/auth/password", { method: "POST", body: { currentPassword: DEMO_PASSWORD, newPassword: "Changed12345" } }),
      );
      expect(pw.status).toBe(403);
      const profile = await call(
        profilePATCH,
        req("/api/auth/profile", { method: "PATCH", body: { firstName: "Взлом", lastName: "Тест", phone: "+7 700 111 22 33" } }),
      );
      expect(profile.status).toBe(403);
      expect(await authDb.user.findUniqueOrThrow({ where: { email: "carrier@tirco.demo" } })).toEqual(before);
    });

    it("любой адрес демо-домена (в т.ч. не с кнопок) — только демо; администратор платформы — без ограничений", async () => {
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      await authDb.user.create({ data: { email: "dispatcher@tirco.demo", firstName: "Д", lastName: "Д", passwordHash } });
      const res = await signInAs("dispatcher@tirco.demo", "real");
      expect((res.json.data as unknown as { dataMode: string }).dataMode).toBe("demo");

      // Администратор платформы входит в реальную базу — но не с общеизвестным демо-паролем (SEC-01)
      await authDb.user.create({
        data: { email: "admin@tirco.demo", firstName: "A", lastName: "A", passwordHash, platformRole: "PLATFORM_ADMIN" },
      });
      expect((await signInAs("admin@tirco.demo", "real")).status).toBe(403);
      await authDb.user.update({
        where: { email: "admin@tirco.demo" },
        data: { passwordHash: await hashPassword("admin-strong-password-1") },
      });
      const admin = await signInAs("admin@tirco.demo", "real", "admin-strong-password-1");
      expect((admin.json.data as unknown as { dataMode: string }).dataMode).toBe("real");
    });

    it("сессия общего демо-аккаунта в реальной базе, выданная до запрета, недействительна", async () => {
      vi.unstubAllEnvs();
      await signInAs("shipper@tirco.demo", "real");
      expect((await getCurrentActor())?.dataMode).toBe("real");
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DEMO_SEED", "1");
      expect(await getCurrentActor()).toBeNull();
    });

    it("общий демо-аккаунт не принимает приглашение в компанию реальной базы", async () => {
      const company = await makeCompany("SHIPPER", "Real Co");
      const inviter = await makeUser({ role: "SHIPPER", companyId: company.id });
      const token = generateToken();
      await authDb.companyInvite.create({
        data: {
          companyId: company.id,
          email: "shipper@tirco.demo",
          role: "SHIPPER",
          tokenHash: sha256(token),
          invitedByUserId: inviter.id,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      await signInAs("shipper@tirco.demo", "demo");
      const res = await call(inviteAcceptPOST, req("/api/auth/invite/accept", { method: "POST", body: { token } }));
      expect(res.status).toBe(403);
      expect(await authDb.companyMember.count({ where: { companyId: company.id, user: { email: "shipper@tirco.demo" } } })).toBe(0);
    });

    it("обычный пользователь по-прежнему входит в реальную базу", async () => {
      const res = await signIn(shipperEmail, "real");
      expect(res.status).toBe(200);
      expect((await sessionRow()).dataMode).toBe("REAL");
    });
  });
});

describe("Миграция демо-домена CargoFlow → Tirco", () => {
  const sql = readFileSync("prisma/migrations/20261013210000_demo_email_domain_tirco/migration.sql", "utf8");

  it("переводит демо-аккаунты на tirco.demo, кроме администратора платформы и занятых адресов", async () => {
    const rename = async (email: string, admin = false) => {
      const u = await makeUser({ admin });
      await authDb.user.update({ where: { id: u.id }, data: { email } });
      return u.id;
    };
    const shipper = await rename("shipper@cargoflow.demo");
    const generated = await rename("admin.x@carriers.cargoflow.demo");
    const admin = await rename("admin@cargoflow.demo", true);
    const taken = await rename("carrier@cargoflow.demo");
    await rename("carrier@tirco.demo");
    const lookalike = await rename("user@notcargoflow.demo");

    await authDb.$executeRawUnsafe(sql);
    const email = async (id: string) => (await authDb.user.findUniqueOrThrow({ where: { id } })).email;
    expect(await email(shipper)).toBe("shipper@tirco.demo");
    expect(await email(generated)).toBe("admin.x@carriers.tirco.demo");
    expect(await email(admin)).toBe("admin@cargoflow.demo");
    expect(await email(taken)).toBe("carrier@cargoflow.demo");
    expect(await email(lookalike)).toBe("user@notcargoflow.demo");

    // Повторный запуск ничего не меняет
    expect(await authDb.$executeRawUnsafe(sql)).toBe(0);
  });

  it("схему демо-базы не трогает: старую демо-базу seed:demo загрузит заново", async () => {
    const id = await runWithDataMode("demo", async () => {
      const u = await makeUser();
      await prisma.user.update({ where: { id: u.id }, data: { email: "shipper@cargoflow.demo" } });
      return u.id;
    });
    expect(await demo.$executeRawUnsafe(sql)).toBe(0);
    expect((await demo.user.findUniqueOrThrow({ where: { id } })).email).toBe("shipper@cargoflow.demo");
  });
});
