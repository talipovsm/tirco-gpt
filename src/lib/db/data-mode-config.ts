/**
 * Конфигурация подключений для режимов данных (без server-only: используется и скриптами миграций/seed).
 *
 * REAL — DATABASE_URL (identity, сессии и реальные бизнес-данные).
 * DEMO — DEMO_DATABASE_URL; если не задан — та же СУБД, отдельная схема `tirco_demo`
 *        (полная изоляция таблиц без дополнительной инфраструктуры).
 * Схема берётся из параметра `?schema=` строки подключения (как у Prisma), по умолчанию `public`.
 */
import type { DataMode } from "./data-mode";

export const DEFAULT_DEMO_SCHEMA = "tirco_demo";
/** Метки схем (COMMENT ON SCHEMA): seed:demo пишет только в схему с меткой demo. */
export const SCHEMA_MARKER: Record<DataMode, string> = { real: "tirco:real", demo: "tirco:demo" };

/** Метки до переименования проекта (CargoFlow → Tirco): `cargoflow:real` / `cargoflow:demo`. */
const LEGACY_MARKER_PREFIX = "cargoflow:";

/**
 * Метка схемы в текущем формате: прежняя `cargoflow:<режим>` считается `tirco:<режим>`;
 * чужие комментарии (например, «standard public schema») — не метка, `null`.
 */
export function normalizeSchemaMarker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith(LEGACY_MARKER_PREFIX)) return `tirco:${raw.slice(LEGACY_MARKER_PREFIX.length)}`;
  return raw.startsWith("tirco:") ? raw : null;
}

export type DbTarget = { connectionString: string; schema: string };

const SCHEMA_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export function parseDbUrl(url: string, fallbackSchema = "public"): DbTarget {
  const u = new URL(url);
  const schema = u.searchParams.get("schema") || fallbackSchema;
  if (!SCHEMA_RE.test(schema)) throw new Error(`Недопустимое имя схемы БД: ${schema}`);
  u.searchParams.delete("schema");
  return { connectionString: u.toString(), schema };
}

/** Одна и та же СУБД, база и схема (учётные данные не учитываются). */
export function sameTarget(a: DbTarget, b: DbTarget): boolean {
  const key = (t: DbTarget) => {
    const u = new URL(t.connectionString);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}#${t.schema}`;
  };
  return key(a) === key(b);
}

export function dataModeConfig(mode: DataMode, env: Record<string, string | undefined> = process.env): DbTarget {
  const realUrl = env.DATABASE_URL;
  if (!realUrl) throw new Error("DATABASE_URL is not set");
  const real = parseDbUrl(realUrl);
  if (mode === "real") return real;
  const demo = env.DEMO_DATABASE_URL
    ? parseDbUrl(env.DEMO_DATABASE_URL)
    : { connectionString: real.connectionString, schema: DEFAULT_DEMO_SCHEMA };
  if (sameTarget(demo, real)) {
    throw new Error("DEMO_DATABASE_URL указывает на ту же базу и схему, что DATABASE_URL: демо и реальные данные смешались бы.");
  }
  return demo;
}

/** Строка подключения для Prisma CLI (migrate deploy) с явной схемой. */
export function prismaCliUrl(t: DbTarget): string {
  const u = new URL(t.connectionString);
  u.searchParams.set("schema", t.schema);
  return u.toString();
}
