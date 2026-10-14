import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Ссылка на страницу «Нет доступа» с причиной (SEC-08). Причину может подставить в адрес кто угодно, поэтому
 * страница показывает её, только если ссылку подписал сервер. Ключ — APP_SECRET; без него — случайный ключ процесса
 * (ссылка живёт секунды: это редирект сразу после проверки прав).
 */
const g = globalThis as unknown as { __tircoForbiddenKey?: string };
function key(): string {
  if (process.env.APP_SECRET && process.env.APP_SECRET.length >= 16) return process.env.APP_SECRET;
  return (g.__tircoForbiddenKey ??= randomBytes(32).toString("hex"));
}

function sign(reason: string): string {
  return createHmac("sha256", key()).update(`forbidden:${reason}`).digest("base64url").slice(0, 32);
}

export function forbiddenUrl(reason: string): string {
  const text = reason.replace(/\s+/g, " ").trim().slice(0, 200);
  return `/forbidden?reason=${encodeURIComponent(text)}&sig=${sign(text)}`;
}

/** Причина из адреса, если подпись верна; иначе null. */
export function verifiedReason(reason: string | undefined, sig: string | undefined): string | null {
  if (!reason || !sig) return null;
  const expected = Buffer.from(sign(reason));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? reason : null;
}
