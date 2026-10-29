import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/email", () => ({
  deliverEmail: vi.fn(),
  emailDriver: vi.fn(() => "smtp"),
  redactSecrets: (text: string) => text,
}));
import { deliverEmail, emailDriver } from "@/lib/notifications/email";
import { EmailNotificationAdapter, TelegramNotificationAdapter, WhatsAppNotificationAdapter } from "@/lib/notifications/adapters";

const message = {
  deliveryId: "stable-delivery",
  userId: "user",
  email: "driver@example.test",
  type: "STATUS_CHANGED" as const,
  title: "Assigned",
  link: "/driver",
};

beforeEach(() => {
  vi.mocked(emailDriver).mockReturnValue("smtp");
  vi.mocked(deliverEmail).mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("external notification adapter outcomes", () => {
  it("uses the same SMTP Message-ID for every retry", async () => {
    vi.mocked(deliverEmail).mockResolvedValue(true);
    const adapter = new EmailNotificationAdapter();
    expect(await adapter.send(message)).toBe("sent");
    expect(await adapter.send(message)).toBe("sent");
    expect(vi.mocked(deliverEmail).mock.calls.map((args) => args[3])).toEqual([
      "<notification.stable-delivery@tirco>",
      "<notification.stable-delivery@tirco>",
    ]);
  });

  it("does not acknowledge failed SMTP delivery as sent", async () => {
    vi.mocked(deliverEmail).mockResolvedValue(false);
    await expect(new EmailNotificationAdapter().send(message)).rejects.toThrow("SMTP did not accept");
  });

  it("reports logging mode and demo recipients as skipped", async () => {
    vi.mocked(emailDriver).mockReturnValue("log");
    vi.mocked(deliverEmail).mockResolvedValue(false);
    expect(await new EmailNotificationAdapter().send(message)).toBe("skipped");
    vi.mocked(deliverEmail).mockClear();
    expect(await new EmailNotificationAdapter().send({ ...message, email: "driver@tirco.demo" })).toBe("skipped");
    expect(deliverEmail).not.toHaveBeenCalled();
  });

  it("unfinished messenger adapters do not claim to be enabled by a token", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_API_TOKEN", "test-token");
    expect(new TelegramNotificationAdapter().isEnabled()).toBe(false);
    expect(new WhatsAppNotificationAdapter().isEnabled()).toBe(false);
  });
});
