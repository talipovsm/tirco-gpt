#!/bin/sh
# Старт контейнера: миграции обеих баз → (DEMO_SEED=1) демо-аккаунты в REAL и демо-данные в фоне → сервер.
# Seed пишет только в демо-базу (проверка конфигурации и метки схемы) и не блокирует healthcheck.
set -e
npx tsx scripts/db-modes.ts migrate
if [ "$DEMO_SEED" = "1" ]; then
  # Демо-аккаунты для входа — в REAL (вход проверяется по ней); сбой не мешает старту сервера
  npm run demo:logins || echo "[demo-logins] пропущено — вход демо-аккаунтами может не работать"
  npm run seed:demo &
fi
exec npx next start -p "${PORT:-3000}"
