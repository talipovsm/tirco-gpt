-- PERF-03: триграммные индексы для поиска по подстроке (ILIKE '%…%') в бирже грузов, перевозках и глобальном поиске.
-- Обычный B-tree для такого поиска не используется, и запрос читает таблицу целиком.
-- pg_trgm — доверенное расширение (PostgreSQL 13+): его может включить владелец базы без прав суперпользователя.
-- Расширение ставится в схему public, чтобы реальная (public) и демо-схема (tirco_demo) использовали одни операторы.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE INDEX "Load_title_trgm_idx" ON "Load" USING GIN ("title" public.gin_trgm_ops);
CREATE INDEX "Load_publicNumber_trgm_idx" ON "Load" USING GIN ("publicNumber" public.gin_trgm_ops);
CREATE INDEX "Load_originCity_trgm_idx" ON "Load" USING GIN ("originCity" public.gin_trgm_ops);
CREATE INDEX "Load_destinationCity_trgm_idx" ON "Load" USING GIN ("destinationCity" public.gin_trgm_ops);
CREATE INDEX "LoadStop_city_trgm_idx" ON "LoadStop" USING GIN ("city" public.gin_trgm_ops);
CREATE INDEX "TransportOrder_publicNumber_trgm_idx" ON "TransportOrder" USING GIN ("publicNumber" public.gin_trgm_ops);
CREATE INDEX "Company_legalName_trgm_idx" ON "Company" USING GIN ("legalName" public.gin_trgm_ops);
