import { describe, expect, it } from "vitest";
import { forbiddenUrl, verifiedReason } from "@/lib/auth/forbidden-link";

describe("SEC-08: причина на странице «Нет доступа»", () => {
  it("показывается для ссылки, подписанной сервером", () => {
    const url = new URL(forbiddenUrl("Раздел доступен перевозчикам."), "http://x");
    expect(verifiedReason(url.searchParams.get("reason") ?? undefined, url.searchParams.get("sig") ?? undefined)).toBe(
      "Раздел доступен перевозчикам.",
    );
  });

  it("подставленный текст без подписи или с чужой подписью не показывается", () => {
    const url = new URL(forbiddenUrl("Раздел доступен перевозчикам."), "http://x");
    expect(verifiedReason("Ваш аккаунт взломан, позвоните +7 999", undefined)).toBeNull();
    expect(verifiedReason("Ваш аккаунт взломан", url.searchParams.get("sig") ?? undefined)).toBeNull();
  });
});
