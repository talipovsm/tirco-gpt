/**
 * Миграции обеих баз и метки схем.
 *
 *   npx tsx scripts/db-modes.ts migrate   — prisma migrate deploy для REAL и DEMO, затем метки схем
 *   npx tsx scripts/db-modes.ts status    — куда указывают режимы и какие метки у схем
 *
 * Метка (COMMENT ON SCHEMA) — защита от ошибок конфигурации: seed:demo пишет только в схему с меткой
 * `tirco:demo`, а схему с меткой `tirco:real` никогда не трогает.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import pg from "pg";
import type { DataMode } from "@/lib/db/data-mode";
import { dataModeConfig, normalizeSchemaMarker, prismaCliUrl, SCHEMA_MARKER, type DbTarget } from "@/lib/db/data-mode-config";

const require = createRequire(import.meta.url);

export async function readMarker(t: DbTarget): Promise<string | null> {
  const client = new pg.Client({ connectionString: t.connectionString });
  await client.connect();
  try {
    const { rows } = await client.query<{ marker: string | null }>(
      "SELECT obj_description(oid, 'pg_namespace') AS marker FROM pg_namespace WHERE nspname = $1",
      [t.schema],
    );
    return rows[0]?.marker ?? null;
  } finally {
    await client.end();
  }
}

async function writeMarker(t: DbTarget, mode: DataMode) {
  const raw = await readMarker(t);
  // Метки Tirco начинаются с «tirco:» (прежние «cargoflow:» переписываются); прочие комментарии не считаются
  const current = normalizeSchemaMarker(raw);
  const expected = SCHEMA_MARKER[mode];
  if (current && current !== expected) {
    throw new Error(`Схема "${t.schema}" помечена как ${raw}, а настроена для режима ${mode}. Проверьте DATABASE_URL / DEMO_DATABASE_URL.`);
  }
  if (raw === expected) return;
  const client = new pg.Client({ connectionString: t.connectionString });
  await client.connect();
  try {
    await client.query(`COMMENT ON SCHEMA "${t.schema}" IS '${expected}'`);
  } finally {
    await client.end();
  }
}

function migrate(t: DbTarget, mode: DataMode) {
  console.log(`→ Миграции ${mode.toUpperCase()} (схема ${t.schema})`);
  // Явная схема в URL: Prisma CLI создаёт её при необходимости; учётные данные не печатаются
  // Windows не запускает npx.cmd через execFileSync без shell; Node запускает CLI на всех ОС.
  execFileSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: prismaCliUrl(t) },
  });
}

async function main() {
  const cmd = process.argv[2] ?? "status";
  const real = dataModeConfig("real");
  const demo = dataModeConfig("demo"); // бросает ошибку, если демо указывает туда же, что и реальная
  if (cmd === "migrate") {
    for (const [mode, t] of [
      ["real", real],
      ["demo", demo],
    ] as const) {
      migrate(t, mode);
      await writeMarker(t, mode);
    }
    console.log("✓ Обе базы в актуальном состоянии");
    return;
  }
  for (const [mode, t] of [
    ["real", real],
    ["demo", demo],
  ] as const) {
    const u = new URL(t.connectionString);
    console.log(
      `${mode.padEnd(5)} → ${u.hostname}:${u.port || 5432}${u.pathname} схема ${t.schema} · метка: ${(await readMarker(t)) ?? "нет"}`,
    );
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/db-modes.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
