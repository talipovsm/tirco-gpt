-- Демо-аккаунты, созданные до переименования проекта (CargoFlow → Tirco), переводятся на текущий демо-домен:
-- страница входа и seed используют *@tirco.demo, а вход проверяется по реальной базе.
-- Адрес не меняется, если аккаунт с новым адресом уже есть.
UPDATE "User" AS u
SET "email" = regexp_replace(u."email", '(@|\.)cargoflow\.demo$', '\1tirco.demo'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE u."email" ~ '(@|\.)cargoflow\.demo$'
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS t
    WHERE t."email" = regexp_replace(u."email", '(@|\.)cargoflow\.demo$', '\1tirco.demo')
  );
