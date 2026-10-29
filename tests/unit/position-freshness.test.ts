import { describe, expect, it } from "vitest";
import { describePosition } from "@/features/tracking/position-freshness";

const now = new Date("2026-10-29T12:00:00Z");

describe("Источник и свежесть позиции", () => {
  it("отличает отсутствие координат от оценки маршрута", () => {
    expect(describePosition(null, now)).toMatchObject({ source: "missing", label: "Нет координат" });
    expect(describePosition({ source: "estimated", at: now.toISOString() }, now)).toMatchObject({
      source: "estimated",
      label: "Примерная позиция",
    });
  });

  it("показывает возраст GPS-отметки, а не время получения страницы", () => {
    expect(describePosition({ source: "tracking", at: "2026-10-29T10:00:00Z" }, now)).toMatchObject({
      source: "tracking",
      label: "GPS · 2 часа назад",
    });
    expect(describePosition({ source: "tracking", at: now.toISOString() }, now).label).toBe("GPS · сейчас");
  });

  it.each([null, "", "not-a-date"])("не выдаёт отсутствующее или ошибочное время %s за свежую позицию", (at) => {
    expect(describePosition({ source: "tracking", at }, now).label).toBe("GPS · время неизвестно");
  });

  it("не выдаёт будущую отметку за актуальную позицию", () => {
    expect(describePosition({ source: "tracking", at: "2026-10-29T13:00:00Z" }, now)).toMatchObject({
      source: "tracking",
      label: "GPS · проверьте время",
    });
  });

  it("не приписывает GPS-происхождение координатам без источника", () => {
    expect(describePosition({}, now)).toMatchObject({ source: "unknown", label: "Координаты" });
  });
});
