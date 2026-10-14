import { describe, expect, it } from "vitest";
import { parseDisplayDate, parseDisplayTime } from "@/components/common/date-time-field";

describe("UX-05: поля даты и времени в формате интерфейса", () => {
  it("дата ДД.ММ.ГГГГ → ISO, несуществующие и неполные даты отклоняются", () => {
    expect(parseDisplayDate("15.10.2026")).toBe("2026-10-15");
    expect(parseDisplayDate("29.02.2028")).toBe("2028-02-29");
    expect(parseDisplayDate("29.02.2027")).toBeNull();
    expect(parseDisplayDate("31.04.2026")).toBeNull();
    expect(parseDisplayDate("15.10.20")).toBeNull();
  });
  it("время 24 ч", () => {
    expect(parseDisplayTime("09:00")).toBe("09:00");
    expect(parseDisplayTime("23:59")).toBe("23:59");
    expect(parseDisplayTime("24:00")).toBeNull();
    expect(parseDisplayTime("9:00")).toBeNull();
  });
});
