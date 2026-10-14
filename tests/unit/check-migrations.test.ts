import { describe, expect, it } from "vitest";
import { scanMigration } from "../../scripts/check-migrations.mjs";

describe("OPS-05: проверка миграций на разрушительные операции", () => {
  it("пропускает добавление таблиц, колонок, индексов и значений enum", () => {
    expect(
      scanMigration(`CREATE TABLE "A" ("id" UUID);
ALTER TABLE "A" ADD COLUMN "b" TEXT;
DROP INDEX "A_b_idx";
ALTER TYPE "Role" ADD VALUE 'X';
ALTER TABLE "A" ADD CONSTRAINT "f" FOREIGN KEY ("id") REFERENCES "B"("id") ON DELETE CASCADE ON UPDATE CASCADE;`),
    ).toEqual([]);
  });
  it("находит удаление, смену типа, массовые изменения и переименование", () => {
    expect(scanMigration(`ALTER TABLE "A" DROP COLUMN "b";`)).toContain("удаление объекта");
    expect(scanMigration(`DROP TABLE "A";`)).toContain("удаление объекта");
    expect(scanMigration(`TRUNCATE "A";`)).toContain("TRUNCATE");
    expect(scanMigration(`DELETE FROM "A";`)).toContain("удаление данных");
    expect(scanMigration(`UPDATE "User" SET "email" = lower("email");`)).toContain("массовое изменение данных");
    expect(scanMigration(`ALTER TABLE "A" ALTER COLUMN "b" SET DATA TYPE INTEGER;`)).toContain("смена типа колонки");
    expect(scanMigration(`ALTER TABLE "A" ALTER COLUMN "b" SET NOT NULL;`)).toHaveLength(1);
    expect(scanMigration(`ALTER TABLE "A" RENAME COLUMN "b" TO "c";`)).toHaveLength(1);
  });
  it("операции в комментариях не считаются; отметка ревью снимает запрет", () => {
    expect(scanMigration(`-- раньше здесь был DROP TABLE "A"\nCREATE INDEX "i" ON "A"("b");`)).toEqual([]);
    expect(
      scanMigration(`-- migration-safety: reviewed — бэкап снят, колонка не используется с v0.3\nALTER TABLE "A" DROP COLUMN "b";`),
    ).toEqual([]);
  });
});
