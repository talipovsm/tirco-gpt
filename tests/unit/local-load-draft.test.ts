import { describe, expect, it } from "vitest";
import { hasLoadDraftChanges, LOAD_DRAFT_TTL_MS, localLoadDraftKey, parseLocalLoadDraft } from "@/features/loads/local-load-draft";
import { defaultWizardValues } from "@/features/loads/wizard-values";

const now = Date.now();
const values = { ...defaultWizardValues, stops: defaultWizardValues.stops.map((s, i) => ({ ...s, city: i === 0 ? "Урумчи" : "" })) };
const draft = { version: 1, updatedAt: now, step: 0, idempotencyKey: "1d47c23d-404e-44d7-9237-9ecc1b9ac2f6", values };

describe("локальная копия незавершённого груза", () => {
  it("сохраняет неполную форму, шаг и ключ повторной отправки без требования заполнить груз", () => {
    expect(parseLocalLoadDraft(JSON.stringify(draft), now)).toEqual(draft);
    expect(hasLoadDraftChanges(values)).toBe(true);
    expect(hasLoadDraftChanges(defaultWizardValues)).toBe(false);
  });

  it("разделяет аккаунты, компании и реальные/демо-данные", () => {
    const scope = { userId: "user-1", companyId: "company-1", dataMode: "real" as const };
    const keys = [scope, { ...scope, userId: "user-2" }, { ...scope, companyId: "company-2" }, { ...scope, dataMode: "demo" as const }].map(
      localLoadDraftKey,
    );
    expect(new Set(keys).size).toBe(4);
  });

  it("не восстанавливает истёкшие, повреждённые и неизвестные версии копий", () => {
    for (const raw of [
      null,
      "not-json",
      JSON.stringify({ ...draft, version: 2 }),
      JSON.stringify({ ...draft, updatedAt: now - LOAD_DRAFT_TTL_MS }),
      JSON.stringify({ ...draft, updatedAt: now + 120_000 }),
    ]) {
      expect(parseLocalLoadDraft(raw, now)).toBeNull();
    }
  });

  it("отклоняет данные, которые могут сломать форму или расчёт дат", () => {
    const cases = [
      { ...draft, step: 9 },
      { ...draft, values: { ...values, stops: [] } },
      { ...draft, values: { ...values, title: { dangerous: "shape" } } },
      { ...draft, values: { ...values, stops: values.stops.map((s) => ({ ...s, date: "2026-02-31" })) } },
      { ...draft, values: { ...values, stops: values.stops.map((s) => ({ ...s, timeFrom: "99:99" })) } },
    ];
    for (const invalid of cases) expect(parseLocalLoadDraft(JSON.stringify(invalid), now)).toBeNull();
    expect(parseLocalLoadDraft(" ".repeat(100_001), now)).toBeNull();
  });
});
