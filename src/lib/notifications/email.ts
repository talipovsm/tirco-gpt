import "server-only";
import { logger } from "@/lib/logger";

/**
 * Доставка писем (OPS-02). Драйвер — EMAIL_DRIVER:
 *  - `smtp` — отправка через SMTP (SMTP_URL или SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_SECURE, отправитель EMAIL_FROM);
 *  - `log`  — письмо пишется в лог (разработка; в production токены скрыты, письмо не доставляется);
 *  - `none` — письма отключены (тесты).
 * Решение и альтернативы — docs/adr/0002-email-delivery.md.
 */
export type EmailDriver = "smtp" | "log" | "none";

export function emailDriver(): EmailDriver {
  const d = (process.env.EMAIL_DRIVER ?? "log").toLowerCase();
  return d === "smtp" || d === "none" ? d : "log";
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
}

/** Письма реально доставляются получателю (а не только пишутся в лог). */
export function emailDeliveryEnabled(): boolean {
  return emailDriver() === "smtp" && smtpConfigured();
}

export function maskEmail(email: string): string {
  if (process.env.NODE_ENV !== "production") return email;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain ?? ""}`;
}

/**
 * Секреты в ссылках (токены сброса пароля и приглашений) никогда не пишутся в лог в production:
 * доступ к логам не должен давать доступ к учётным записям.
 */
export function redactSecrets(text: string): string {
  if (process.env.NODE_ENV !== "production") return text;
  return text.replace(/([?&]token=)[^&\s]+/gi, "$1[REDACTED]").replace(/(\/invite\/)[A-Za-z0-9_-]+/g, "$1[REDACTED]");
}

type Transport = { sendMail(m: { from: string; to: string; subject: string; text: string; messageId?: string }): Promise<unknown> };
let transport: Promise<Transport> | null = null;

async function smtpTransport(): Promise<Transport> {
  transport ??= import("nodemailer").then((m) => {
    const nodemailer = (m as unknown as { default?: typeof m }).default ?? m;
    // Keep one delivery attempt bounded below the durable worker's lease.
    const timeouts = { connectionTimeout: 20_000, greetingTimeout: 20_000, socketTimeout: 60_000 };
    if (process.env.SMTP_URL) return nodemailer.createTransport({ url: process.env.SMTP_URL, ...timeouts });
    const port = Number(process.env.SMTP_PORT ?? 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      ...timeouts,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
    });
  });
  return transport;
}

/** Тестовая подмена транспорта (интеграционные тесты). */
export function setEmailTransportForTests(t: Transport | null) {
  transport = t ? Promise.resolve(t) : null;
}

/**
 * Отправка письма. Ошибки доставки не пробрасываются (ответ пользователю не должен зависеть от почтового сервера
 * и раскрывать существование адреса), а пишутся в лог; две попытки с паузой.
 * Возвращает true, если письмо принято SMTP-сервером.
 */
export async function deliverEmail(to: string, subject: string, text: string, messageId?: string): Promise<boolean> {
  const driver = emailDriver();
  if (driver === "none") return false;
  // Адреса демо-домена (демо-аккаунты и персонажи демо-базы) не существуют — писем им не отправляем
  if (/\.demo$/i.test(to.trim())) return false;
  if (driver === "log" || !smtpConfigured()) {
    if (driver === "smtp") logger.warn("email.smtp_not_configured", { subject });
    logger.info("email.dev", { to: maskEmail(to), subject, text: redactSecrets(text) });
    return false;
  }
  const from = process.env.EMAIL_FROM ?? "Tirco <no-reply@localhost>";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await (await smtpTransport()).sendMail({ from, to, subject, text, ...(messageId ? { messageId } : {}) });
      logger.info("email.sent", { to: maskEmail(to), subject });
      return true;
    } catch (e) {
      logger.error("email.failed", { to: maskEmail(to), subject, attempt, error: e instanceof Error ? e.message : String(e) });
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}
