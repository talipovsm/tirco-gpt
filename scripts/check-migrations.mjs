#!/usr/bin/env node
/**
 * Проверка безопасности миграций (OPS-05). Миграции применяются автоматически при старте контейнера
 * (scripts/docker-start.sh), поэтому опасная миграция попадёт в production без ручного шага. Проверка в CI:
 *
 *  1. Применённые миграции неизменны: SHA-256 каждого migration.sql сверяется с prisma/migration-checksums.json.
 *     Изменённая миграция не применится повторно и разойдётся с базой (так нельзя чинить
 *     20261013210000_demo_email_domain_tirco и другие). Новая миграция добавляется в манифест командой
 *     `npm run db:check-migrations -- --write`.
 *  2. Новые миграции без разрушительных операций: DROP TABLE/COLUMN/TYPE/SCHEMA, TRUNCATE, DELETE, UPDATE,
 *     смена типа колонки, SET NOT NULL, RENAME. Если операция нужна, в начале файла пишется строка
 *     `-- migration-safety: reviewed — <план: бэкап, порядок выката, откат>` (см. docs/runbooks/backup-restore.md).
 *     Миграции до аудита (по BASELINE включительно) проверены вручную и не сканируются.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "prisma/migrations");
const MANIFEST = path.join(ROOT, "prisma/migration-checksums.json");
const BASELINE = "20261013210000_demo_email_domain_tirco";
const MARKER = /^--\s*migration-safety:\s*reviewed\b/im;

const DANGEROUS = [
  [/\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA|EXTENSION|VIEW|MATERIALIZED\s+VIEW)\b/i, "удаление объекта"],
  [/\bTRUNCATE\b/i, "TRUNCATE"],
  [/\bDELETE\s+FROM\b/i, "удаление данных"],
  [/(^|;)\s*UPDATE\s+"?\w/im, "массовое изменение данных"],
  [/\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i, "смена типа колонки"],
  [/\bSET\s+NOT\s+NULL\b/i, "SET NOT NULL на существующей колонке"],
  [/\bRENAME\b/i, "переименование (ломает работающую версию приложения)"],
];

const stripComments = (sql) => sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

export function scanMigration(sql) {
  if (MARKER.test(sql)) return [];
  const body = stripComments(sql);
  return DANGEROUS.filter(([re]) => re.test(body)).map(([, label]) => label);
}

function migrations() {
  return readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function main() {
  const write = process.argv.includes("--write");
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const problems = [];
  const next = { ...manifest };

  for (const name of migrations()) {
    const sql = readFileSync(path.join(DIR, name, "migration.sql"), "utf8");
    const sum = sha256(sql);
    if (manifest[name] && manifest[name] !== sum) {
      problems.push(`${name}: файл изменён после фиксации — применённые миграции не редактируют, создайте новую`);
    } else if (!manifest[name]) {
      if (write) next[name] = sum;
      else problems.push(`${name}: нет в prisma/migration-checksums.json — после ревью выполните npm run db:check-migrations -- --write`);
    }
    if (name > BASELINE) {
      const found = scanMigration(sql);
      if (found.length) {
        problems.push(
          `${name}: ${found.join(", ")}. Нужен план (бэкап → выкат → откат) и строка «-- migration-safety: reviewed — …» в начале файла`,
        );
      }
    }
  }
  for (const name of Object.keys(manifest)) {
    if (!existsSync(path.join(DIR, name))) problems.push(`${name}: миграция удалена — применённые миграции удалять нельзя`);
  }

  if (write) writeFileSync(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
  if (problems.length) {
    console.error(`Проверка миграций не пройдена:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Миграции в порядке (${migrations().length}).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
