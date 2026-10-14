-- SEC-04: регистрационный номер закрепляется только за проверенной компанией.
-- Раньше номер был уникален среди всех компаний, и незарегистрированную компанию можно было «занять»
-- без какой-либо проверки. Теперь неподтверждённых компаний с одним номером может быть несколько,
-- а проверенной (VERIFIED) — только одна. Данные не меняются: прежнее ограничение было строже нового.

-- DropIndex
DROP INDEX "Company_country_registrationNumber_key";

-- CreateIndex
CREATE INDEX "Company_country_registrationNumber_idx" ON "Company"("country", "registrationNumber");

CREATE UNIQUE INDEX "Company_verified_registration_unique" ON "Company" ("country", "registrationNumber")
  WHERE "verificationStatus" = 'VERIFIED' AND "deletedAt" IS NULL;
