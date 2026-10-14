/**
 * Оповещения об ошибках (OPS-06): каждая запись logger.error уходит POST-запросом на ALERT_WEBHOOK_URL
 * (входящий webhook Slack, Mattermost, Discord, или свой приёмник). Тело — JSON с полями text и content
 * (их понимают Slack/Mattermost и Discord) и структурированными level/msg/ts/detail.
 *
 * Персональные данные маскируются до отправки: email, телефоны, токены в ссылках; ключи с паролями и секретами
 * логгер заменяет на [REDACTED] ещё раньше. Одинаковые ошибки повторно не отправляются 5 минут, всего — не больше
 * ALERT_MAX_PER_HOUR в час (по умолчанию 30): лавина ошибок не превращается в лавину сообщений.
 * Отправка не блокирует запрос и никогда не бросает исключение. Модуль не зависит от Node.js (работает и в edge).
 */

const DEDUP_MS = 5 * 60_000;
const HOUR = 60 * 60_000;

const lastSent = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;

/** Маскирование персональных данных и секретов в тексте оповещения. */
export function maskPii(text: string): string {
  return (
    text
      // email: первая буква и домен
      .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "$1***@$2")
      // телефоны: последовательности из 10+ цифр с разделителями, остаются последние 2 цифры
      .replace(/\+?\d[\d\s()-]{8,}\d/g, (m) => {
        const digits = m.replace(/\D/g, "");
        return digits.length >= 10 ? `***${digits.slice(-2)}` : m;
      })
      // токены в ссылках сброса пароля, подтверждения email и приглашений
      .replace(/([?&](token|code|key)=)[^&\s"]+/gi, "$1[REDACTED]")
      .replace(/(\/invite\/)[A-Za-z0-9_-]+/g, "$1[REDACTED]")
      // Bearer-токены
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
  );
}

function shouldSend(key: string, now: number): boolean {
  const max = Number(process.env.ALERT_MAX_PER_HOUR ?? 30);
  if (now - windowStart > HOUR) {
    windowStart = now;
    sentInWindow = 0;
  }
  const prev = lastSent.get(key);
  if (prev !== undefined && now - prev < DEDUP_MS) return false;
  if (sentInWindow >= (Number.isFinite(max) && max > 0 ? max : 30)) return false;
  lastSent.set(key, now);
  sentInWindow += 1;
  if (lastSent.size > 500) {
    for (const [k, t] of lastSent) if (now - t > DEDUP_MS) lastSent.delete(k);
  }
  return true;
}

export function alertingEnabled(): boolean {
  return Boolean(process.env.ALERT_WEBHOOK_URL);
}

/**
 * Отправка оповещения. Возвращает промис отправки (для тестов и onRequestError) или null, если оповещение
 * не отправляется (не настроено, дубликат, превышен лимит).
 */
export function sendAlert(msg: string, detail: Record<string, unknown> = {}, now = Date.now()): Promise<void> | null {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return null;
  const key = `${msg}|${String(detail.path ?? detail.code ?? "")}`;
  if (!shouldSend(key, now)) return null;
  const service = process.env.ALERT_SERVICE_NAME || "Tirco";
  const env = process.env.NODE_ENV ?? "development";
  const body = maskPii(JSON.stringify(detail)).slice(0, 3000);
  const text = `🔴 ${service} (${env}): ${msg}\n${body}`;
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, content: text.slice(0, 1900), level: "error", msg, service, env, ts: new Date(now).toISOString() }),
    signal: AbortSignal.timeout(3000),
  }).then(
    () => undefined,
    // Сбой оповещения пишется в stdout, но не порождает новое оповещение
    (e: unknown) => console.warn(JSON.stringify({ level: "warn", msg: "alert.failed", error: e instanceof Error ? e.message : String(e) })),
  );
}

export function resetAlertingForTests() {
  lastSent.clear();
  windowStart = 0;
  sentInWindow = 0;
}
