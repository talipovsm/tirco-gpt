import "server-only";
import type { NotificationType } from "@/generated/prisma/enums";
import { logger } from "@/lib/logger";
import { deliverEmail, emailDriver } from "@/lib/notifications/email";

export type OutboundNotification = {
  userId: string;
  email?: string | null;
  phone?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

/** Канал доставки уведомлений. In-app уведомления пишутся в БД сервисом напрямую. */
export interface NotificationAdapter {
  readonly channel: "email" | "telegram" | "whatsapp";
  isEnabled(): boolean;
  send(n: OutboundNotification): Promise<void>;
}

export { redactSecrets } from "@/lib/notifications/email";

/** Email: SMTP в production, лог в разработке (см. src/lib/notifications/email.ts). */
export class EmailNotificationAdapter implements NotificationAdapter {
  readonly channel = "email" as const;
  isEnabled() {
    return emailDriver() !== "none";
  }
  async send(n: OutboundNotification) {
    if (!n.email) return;
    const url = n.link ? `${process.env.APP_URL ?? ""}${n.link}` : "";
    await deliverEmail(n.email, `Tirco: ${n.title}`, `${n.body ?? ""} ${url}`.trim());
  }
}

/** Telegram-бот: архитектурная точка расширения. Работает только при наличии TELEGRAM_BOT_TOKEN и привязке chat_id. */
export class TelegramNotificationAdapter implements NotificationAdapter {
  readonly channel = "telegram" as const;
  isEnabled() {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  }
  async send(n: OutboundNotification) {
    // Привязка chat_id к пользователю не входит в MVP — канал не отправляет сообщения.
    logger.debug("telegram.skip", { userId: n.userId, type: n.type });
  }
}

/** WhatsApp Business API: архитектурная точка расширения (не требуется для локального запуска). */
export class WhatsAppNotificationAdapter implements NotificationAdapter {
  readonly channel = "whatsapp" as const;
  isEnabled() {
    return Boolean(process.env.WHATSAPP_API_TOKEN);
  }
  async send(n: OutboundNotification) {
    logger.debug("whatsapp.skip", { userId: n.userId, type: n.type });
  }
}

export const externalAdapters: NotificationAdapter[] = [
  new EmailNotificationAdapter(),
  new TelegramNotificationAdapter(),
  new WhatsAppNotificationAdapter(),
];

/** Прямая отправка email (сброс пароля, приглашения). Возвращает true, если письмо принято почтовым сервером. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  return deliverEmail(to, subject, text);
}
