#!/usr/bin/env node
/**
 * Локальный запуск Tirco «в одну команду» — без Docker и без ручной установки PostgreSQL.
 *
 *   npm run setup   — .env, база данных, миграции, демо-данные
 *   npm run local   — запуск базы + приложения на первом свободном порту от 3000
 *
 * Если в .env указан доступный PostgreSQL (например, из docker compose), используется он.
 * Иначе поднимается встроенный PostgreSQL 16 (npm-пакет embedded-postgres) в папке .local/pgdata.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { findAvailablePort, localAppUrl } from "./local-runtime.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env");
const DATA_DIR = path.join(ROOT, ".local", "pgdata");
const EMBEDDED_PORT = 54329;
const EMBEDDED_URL = (db) => `postgresql://postgres:postgres@localhost:${EMBEDDED_PORT}/${db}?schema=public`;

const log = (m) => console.log(`\x1b[36m[tirco]\x1b[0m ${m}`);
const fail = (m) => {
  console.error(`\x1b[31m[tirco] ${m}\x1b[0m`);
  process.exit(1);
};

// ───────── .env ─────────

function readEnv() {
  const env = {};
  if (!existsSync(ENV_FILE)) return env;
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function setEnvValue(key, value) {
  let text = readFileSync(ENV_FILE, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}="${value}"`;
  text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_FILE, text);
}

function ensureEnvFile() {
  if (!existsSync(ENV_FILE)) {
    copyFileSync(path.join(ROOT, ".env.example"), ENV_FILE);
    setEnvValue("APP_SECRET", randomBytes(32).toString("hex"));
    log("Создан файл .env (со случайным APP_SECRET)");
  }
}

// ───────── PostgreSQL ─────────

async function canConnect(url) {
  if (!url) return false;
  const client = new pg.Client({ connectionString: url.replace(/\?schema=\w+/, ""), connectionTimeoutMillis: 2500 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureDatabases(adminUrl, names) {
  const client = new pg.Client({ connectionString: adminUrl.replace(/\/[^/?]+(\?.*)?$/, "/postgres") });
  await client.connect();
  for (const name of names) {
    const r = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (r.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
      log(`Создана база данных ${name}`);
    }
  }
  await client.end();
}

let embedded = null;

async function startEmbedded() {
  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import("embedded-postgres"));
  } catch {
    fail("Пакет embedded-postgres не установлен. Выполните: npm install");
  }
  const fresh = !existsSync(path.join(DATA_DIR, "PG_VERSION"));
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  embedded = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: EMBEDDED_PORT,
    persistent: true,
    onLog: () => {},
    onError: (e) => console.error(String(e)),
  });
  if (fresh) {
    log("Первый запуск: инициализация встроенного PostgreSQL 16 (один раз, ~10 сек)...");
    await embedded.initialise();
  }
  await embedded.start();
  log(`PostgreSQL запущен на порту ${EMBEDDED_PORT} (данные: .local/pgdata)`);
}

async function stopEmbedded() {
  if (embedded) {
    await embedded.stop().catch(() => {});
    embedded = null;
  }
}

/** Выбирает базу: внешний PostgreSQL из .env, если доступен, иначе встроенный. */
async function ensureDatabase() {
  ensureEnvFile();
  const env = readEnv();
  if (env.LOCAL_EMBEDDED_DB !== "1" && (await canConnect(env.DATABASE_URL))) {
    log("Используется PostgreSQL из .env");
    await ensureDatabases(env.DATABASE_URL, [dbName(env.DATABASE_URL), dbName(env.TEST_DATABASE_URL ?? "")].filter(Boolean));
    return readEnv();
  }
  await startEmbedded();
  setEnvValue("LOCAL_EMBEDDED_DB", "1");
  setEnvValue("DATABASE_URL", EMBEDDED_URL("tirco"));
  setEnvValue("TEST_DATABASE_URL", EMBEDDED_URL("tirco_test"));
  await ensureDatabases(EMBEDDED_URL("postgres"), ["tirco", "tirco_test"]);
  return readEnv();
}

function dbName(url) {
  return url.match(/\/([^/?]+)(\?|$)/)?.[1];
}

// ───────── Команды ─────────

function run(script, args, env) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.error) throw r.error;
  if (r.status !== 0)
    throw new Error(`Команда завершилась с ошибкой (код ${r.status ?? r.signal}): ${path.basename(script)} ${args.join(" ")}`);
}

async function setup() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 9)) fail(`Нужен Node.js 20.9+ (сейчас ${process.versions.node})`);
  const env = await ensureDatabase();
  try {
    log("Генерация Prisma Client...");
    run(require.resolve("prisma/build/index.js"), ["generate"], env);
    log("Применение миграций (реальная и демо-база)...");
    run(require.resolve("tsx/cli"), ["scripts/db-modes.ts", "migrate"], env);
    log("Загрузка демо-аккаунтов...");
    run(require.resolve("tsx/cli"), ["--conditions=react-server", "prisma/seed.ts"], env);
    log("Загрузка демо-базы...");
    run(require.resolve("tsx/cli"), ["--conditions=react-server", "prisma/seed-demo.ts"], env);
  } finally {
    await stopEmbedded();
  }
  log("Готово! Запустите приложение: npm run local");
}

function openBrowser(url) {
  const [command, args] =
    process.platform === "win32"
      ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  const browser = spawn(command, args, { stdio: "ignore" });
  browser.on("error", () => log(`Откройте в браузере: ${url}`));
  browser.unref();
}

async function runningDevUrl() {
  try {
    // Next.js 16 хранит адрес и PID сервера в lock-файле именно этого проекта.
    const { pid, port } = JSON.parse(readFileSync(path.join(ROOT, ".next/dev/lock"), "utf8"));
    if (!Number.isInteger(pid) || pid < 1 || !Number.isInteger(port) || port < 1 || port > 65535) return null;
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code !== "EPERM") return null;
    }
    const url = `http://localhost:${port}`;
    const [health, brand] = await Promise.all([
      fetch(`${url}/api/health`, { signal: AbortSignal.timeout(8_000), redirect: "error" }),
      fetch(`${url}/brand/tirco-logo.svg`, { signal: AbortSignal.timeout(8_000), redirect: "error" }),
    ]);
    const status = await health.json();
    const logo = await brand.text();
    if (
      health.ok &&
      brand.ok &&
      status.success &&
      status.data?.status === "ok" &&
      logo === readFileSync(path.join(ROOT, "public/brand/tirco-logo.svg"), "utf8")
    ) {
      return url;
    }
  } catch {
    // Нет живого сервера этого проекта: обычный запуск ниже.
  }
  return null;
}

async function openWhenReady(child, url) {
  const deadline = Date.now() + 120_000;
  while (child.exitCode === null && child.signalCode === null && !child.killed && Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5_000) });
      await response.body?.cancel();
      if (response.ok && child.exitCode === null && !child.killed) {
        openBrowser(url);
        return;
      }
    } catch {
      // Next.js ещё запускается или компилирует первый запрос.
    }
    await delay(1_000);
  }
  if (child.exitCode === null && !child.killed) log(`Откройте в браузере: ${url}`);
}

async function dev(mode) {
  const existing = mode === "dev" ? await runningDevUrl() : null;
  if (existing) {
    log(`Tirco уже работает: ${existing}`);
    if (process.argv.includes("--open")) openBrowser(existing);
    return;
  }
  run(path.join(ROOT, "scripts/copy-maplibre-worker.mjs"), [], {});
  const preferredPort = Number(process.env.PORT || readEnv().PORT || 3000);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) log(`Порт ${preferredPort} занят. Выбран свободный порт ${port}.`);
  const env = await ensureDatabase();
  const url = `http://localhost:${port}`;
  const args = [require.resolve("next/dist/bin/next"), mode === "start" ? "start" : "dev", "-p", String(port)];
  log(`Запуск приложения: ${url}  (остановка — Ctrl+C)`);
  log("Демо-вход: shipper@tirco.demo / Demo1234! (кнопки ролей — на странице входа)");
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env, PORT: String(port), APP_URL: localAppUrl(process.env.APP_URL ?? env.APP_URL, port) },
  });
  const shutdown = async () => {
    child.kill("SIGINT");
    await stopEmbedded();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  child.on("error", async (error) => {
    await stopEmbedded();
    fail(`Не удалось запустить Next.js: ${error.message}`);
  });
  child.on("exit", async (code) => {
    await stopEmbedded();
    process.exit(code ?? 0);
  });
  if (process.argv.includes("--open")) void openWhenReady(child, url);
}

const cmd = process.argv[2];
try {
  if (cmd === "setup") await setup();
  else if (cmd === "dev" || cmd === "start") await dev(cmd);
  else if (cmd === "db") {
    await ensureDatabase();
    log("База работает. Ctrl+C — остановить.");
    process.on("SIGINT", async () => {
      await stopEmbedded();
      process.exit(0);
    });
    setInterval(() => {}, 1 << 30);
  } else fail("Использование: node scripts/local.mjs setup|dev|start|db");
} catch (e) {
  await stopEmbedded();
  fail(e instanceof Error ? e.message : String(e));
}
