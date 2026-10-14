import type { NextRequest } from "next/server";
import { runWithDataMode } from "@/lib/db/data-mode";
import { readRawBody } from "@/lib/api/raw-body";
import { fail, ok } from "@/lib/api/response";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifySignedWebhook, webhookSecret } from "@/lib/payments/provider";
import { providerWebhookSchema } from "@/lib/validation/order";
import { handleProviderWebhook } from "@/server/services/secure-deal.service";

/**
 * Webhook платёжного провайдера: результат операции (по ключу идемпотентности Tirco).
 * Подпись: X-Tirco-Timestamp + X-Tirco-Signature (см. verifySignedWebhook), секрет PAYMENT_WEBHOOK_SECRET; тело — до 1 МБ.
 * Повторная доставка того же результата безопасна — операция применяется один раз.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  // Внешние провайдеры работают с реальными данными; демо-режим использует встроенные симуляторы.
  return runWithDataMode("real", async () => {
    const { provider } = await ctx.params;
    const secret = webhookSecret("PAYMENT_WEBHOOK_SECRET", provider);
    if (!secret) return fail("FORBIDDEN", "Webhook платёжного провайдера не настроен.", 403);
    const read = await readRawBody(req);
    if (!read.ok) return fail("VALIDATION_ERROR", "Слишком большой запрос.", 413);
    const raw = read.text;
    const check = verifySignedWebhook(raw, req.headers, secret);
    if (!check.ok) {
      logger.warn("payment.webhook.bad-signature", { provider, reason: check.reason });
      return fail("UNAUTHORIZED", "Неверная подпись.", 401);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail("VALIDATION_ERROR", "Некорректный JSON.", 422);
    }
    const parsed = providerWebhookSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "Некорректные данные webhook.", 422);
    try {
      return ok(await handleProviderWebhook(provider, parsed.data));
    } catch (e) {
      if (isAppError(e)) return fail(e.code, e.message, e.status);
      logger.error("payment.webhook.failed", { provider, error: e });
      return fail("INTERNAL_ERROR", "Ошибка обработки.", 500);
    }
  });
}
