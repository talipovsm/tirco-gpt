import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIpFrom } from "@/lib/auth/session";
import { redactSecrets } from "@/lib/notifications/adapters";
import { getPaymentProvider } from "@/lib/payments/provider";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

describe("SEC-002: IP клиента за доверенным прокси", () => {
  it("берёт адрес, дописанный прокси, а не подставленный клиентом", () => {
    expect(clientIpFrom("6.6.6.6, 203.0.113.7", null, "1")).toBe("203.0.113.7");
    expect(clientIpFrom("6.6.6.6, 203.0.113.7, 10.0.0.2", null, "2")).toBe("203.0.113.7");
    expect(clientIpFrom(null, "198.51.100.1", "1")).toBe("198.51.100.1");
    expect(clientIpFrom("6.6.6.6", "198.51.100.1", "0")).toBe("198.51.100.1");
  });
});

describe("SEC-001: секреты не попадают в лог в production", () => {
  it("маскирует токены сброса пароля и приглашений", () => {
    vi.stubEnv("NODE_ENV", "production");
    const t = redactSecrets("https://x/reset-password?token=abcDEF123 и https://x/invite/Zz-9_ab");
    expect(t).not.toContain("abcDEF123");
    expect(t).not.toContain("Zz-9_ab");
  });
});

describe("PAY-001: тестовый платёжный провайдер в production", () => {
  it("запрещён без явного разрешения", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "sandbox");
    vi.stubEnv("DEMO_SEED", "");
    vi.stubEnv("ALLOW_SANDBOX_PAYMENTS", "");
    expect(() => getPaymentProvider()).toThrow(/запрещён/);
    vi.stubEnv("ALLOW_SANDBOX_PAYMENTS", "1");
    expect(getPaymentProvider().code).toBe("sandbox");
  });
  it("неизвестный провайдер — ошибка конфигурации, а не молчаливая подмена", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "unknown-psp");
    expect(() => getPaymentProvider()).toThrow(/Неизвестный/);
  });
});

describe("SEC-005: безопасный переход после входа", async () => {
  const { safeRedirectPath } = await import("@/lib/safe-redirect");
  it("пропускает только пути своего сайта", () => {
    const o = "https://app.example";
    expect(safeRedirectPath("/orders/1?tab=chat", o)).toBe("/orders/1?tab=chat");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/\t/evil.com", "", null]) {
      expect(safeRedirectPath(bad, o)).toBeNull();
    }
  });
});

describe("CFG-002: cookie сессии в production", async () => {
  const { secureCookies } = await import("@/lib/auth/session");
  it("Secure по умолчанию, кроме явного локального http", () => {
    expect(secureCookies({ NODE_ENV: "production" })).toBe(true);
    expect(secureCookies({ NODE_ENV: "production", APP_URL: "https://cargo.example" })).toBe(true);
    expect(secureCookies({ NODE_ENV: "production", APP_URL: "http://localhost:3000" })).toBe(false);
    expect(secureCookies({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("BIZ-012: риск заправки не ниже самого серьёзного несоответствия", async () => {
  const { transactionRisk } = await import("@/lib/fuel/anomaly-rules");
  it("критическое несоответствие делает заправку критической при низкой сумме баллов", () => {
    expect(transactionRisk(30, [{ severity: "CRITICAL" }])).toBe("CRITICAL");
    expect(transactionRisk(90, [{ severity: "HIGH" }])).toBe("CRITICAL");
    expect(transactionRisk(10, [])).toBe("LOW");
  });
});

describe("ERR-001: фильтры списков валидируются, а не падают в БД", async () => {
  const { orderListQuerySchema } = await import("@/lib/validation/order");
  const { loadListQuerySchema } = await import("@/lib/validation/load");
  it("отклоняет неизвестный статус, мусорную дату и не-UUID", () => {
    expect(orderListQuerySchema.safeParse({ status: "FOO" }).success).toBe(false);
    expect(orderListQuerySchema.safeParse({ dateFrom: "garbage" }).success).toBe(false);
    expect(orderListQuerySchema.safeParse({ carrierId: "abc" }).success).toBe(false);
    expect(loadListQuerySchema.safeParse({ status: "FOO" }).success).toBe(false);
    expect(orderListQuerySchema.parse({ status: "IN_TRANSIT,DELIVERED", dateFrom: "2026-09-01" }).status).toEqual([
      "IN_TRANSIT",
      "DELIVERED",
    ]);
  });
});

describe("SEC-010: подпись webhook с меткой времени", async () => {
  const { createHmac } = await import("node:crypto");
  const { verifySignedWebhook } = await import("@/lib/payments/provider");
  const secret = "whsec_test";
  const sign = (s: string) => createHmac("sha256", secret).update(s).digest("hex");
  const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
  it("принимает свежую подпись и отклоняет повтор старого запроса", () => {
    const body = '{"a":1}';
    const now = Date.now();
    const ts = String(Math.floor(now / 1000));
    expect(
      verifySignedWebhook(body, headers({ "x-tirco-timestamp": ts, "x-tirco-signature": sign(`${ts}.${body}`) }), secret, now).ok,
    ).toBe(true);
    const old = String(Math.floor((now - 10 * 60_000) / 1000));
    expect(
      verifySignedWebhook(body, headers({ "x-tirco-timestamp": old, "x-tirco-signature": sign(`${old}.${body}`) }), secret, now).ok,
    ).toBe(false);
  });
  it("формат без метки времени можно запретить", () => {
    const body = "{}";
    vi.stubEnv("WEBHOOK_REQUIRE_TIMESTAMP", "1");
    expect(verifySignedWebhook(body, headers({ "x-tirco-signature": sign(body) }), secret).ok).toBe(false);
    vi.unstubAllEnvs();
  });
  it("SEC-09: в production метка времени обязательна по умолчанию, отключается только явно", () => {
    const body = "{}";
    const legacy = headers({ "x-tirco-signature": sign(body) });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBHOOK_REQUIRE_TIMESTAMP", "");
    expect(verifySignedWebhook(body, legacy, secret)).toEqual({ ok: false, reason: "timestamp-required" });
    vi.stubEnv("WEBHOOK_REQUIRE_TIMESTAMP", "0");
    expect(verifySignedWebhook(body, legacy, secret).ok).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBHOOK_REQUIRE_TIMESTAMP", "");
    expect(verifySignedWebhook(body, legacy, secret).ok).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("SEC-09: предел размера тела вебхука", async () => {
  const { readRawBody } = await import("@/lib/api/raw-body");
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/x", { method: "POST", body, headers });
  it("читает тело в пределах лимита и прерывает чтение сверх него", async () => {
    expect(await readRawBody(post('{"a":1}'), 100)).toEqual({ ok: true, text: '{"a":1}' });
    expect(await readRawBody(post("x".repeat(101)), 100)).toEqual({ ok: false, reason: "too-large" });
    // Заявленный Content-Length не спасает: считается фактический поток
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("x".repeat(80)));
        c.enqueue(new TextEncoder().encode("x".repeat(80)));
        c.close();
      },
    });
    const chunked = new Request("http://localhost/api/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readRawBody(chunked, 100)).toEqual({ ok: false, reason: "too-large" });
  });
});

describe('VAL-001: строка "false" — это false', async () => {
  const { booleanish } = await import("@/lib/validation/common");
  it("строгий разбор булевых значений", () => {
    expect(booleanish.parse("false")).toBe(false);
    expect(booleanish.parse("true")).toBe(true);
    expect(booleanish.parse(false)).toBe(false);
    expect(booleanish.safeParse("maybe").success).toBe(false);
  });
});
