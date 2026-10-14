import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maskPii, resetAlertingForTests, sendAlert } from "@/lib/alerting";
import { logger } from "@/lib/logger";

describe("OPS-06: оповещения об ошибках", () => {
  const fetchMock = vi.fn(async () => new Response("ok"));
  beforeEach(() => {
    resetAlertingForTests();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const sentBody = (i = 0) => JSON.parse((fetchMock.mock.calls[i] as unknown as [string, RequestInit])[1].body as string);

  it("маскирует email, телефоны и токены", () => {
    const out = maskPii(
      "user ivan.petrov@example.kz tel +7 (700) 123-45-67 link https://x/reset-password?token=abc123&x=1 /invite/Zx9_k Bearer eyJhbGci.x.y",
    );
    expect(out).not.toContain("ivan.petrov");
    expect(out).toContain("i***@example.kz");
    expect(out).not.toContain("123-45");
    expect(out).toContain("***67");
    expect(out).toContain("token=[REDACTED]");
    expect(out).toContain("/invite/[REDACTED]");
    expect(out).not.toContain("eyJhbGci");
    // Числа, не похожие на телефон (суммы, коды), не трогаются
    expect(maskPii("amount 15000 order TR-O-000123")).toBe("amount 15000 order TR-O-000123");
  });

  it("без ALERT_WEBHOOK_URL ничего не отправляется", () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "");
    logger.error("job.failed", { error: "x" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logger.error отправляет оповещение с замаскированными данными и без секретов", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://hooks.example/alert");
    logger.error("email.failed", { to: "client@shipper.kz", password: "Secret123!", detail: "phone 87001234567" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = sentBody();
    expect(body.msg).toBe("email.failed");
    expect(body.text).toContain("email.failed");
    expect(body.text).not.toContain("client@shipper.kz");
    expect(body.text).not.toContain("Secret123!");
    expect(body.text).not.toContain("87001234567");
    // Предупреждения не отправляются
    logger.warn("api.denied", {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("повтор той же ошибки в течение 5 минут не отправляется; общий лимит в час", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://hooks.example/alert");
    vi.stubEnv("ALERT_MAX_PER_HOUR", "3");
    const t = 1_800_000_000_000;
    expect(sendAlert("a", {}, t)).not.toBeNull();
    expect(sendAlert("a", {}, t + 60_000)).toBeNull();
    expect(sendAlert("a", {}, t + 6 * 60_000)).not.toBeNull();
    expect(sendAlert("b", {}, t + 7 * 60_000)).not.toBeNull();
    expect(sendAlert("c", {}, t + 8 * 60_000)).toBeNull();
    expect(sendAlert("c", {}, t + 61 * 60_000)).not.toBeNull();
  });

  it("сбой приёмника не бросает исключение", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://hooks.example/alert");
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(sendAlert("x", {})).resolves.toBeUndefined();
  });
});
