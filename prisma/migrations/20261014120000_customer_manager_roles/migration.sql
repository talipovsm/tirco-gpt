-- SEC-06: роли менеджеров грузовладельца и экспедитора (без подписи договоров, отмен, платежей и управления компанией).
-- Существующие участники остаются руководителями (SHIPPER / FORWARDER). Аддитивная миграция.

ALTER TYPE "MemberRole" ADD VALUE 'SHIPPER_MANAGER';
ALTER TYPE "MemberRole" ADD VALUE 'FORWARDER_MANAGER';
