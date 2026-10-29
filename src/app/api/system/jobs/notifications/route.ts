import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/response";
import { DATA_MODES, runWithDataMode } from "@/lib/db/data-mode";
import { logger } from "@/lib/logger";
import { demoWorkspaceReady } from "@/server/services/demo-workspace.service";
import { processNotificationDeliveries } from "@/server/services/notification-delivery.service";

/** Durable notification worker; same CRON_SECRET contract as the other system jobs. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail("FORBIDDEN", "Плановые задачи отключены: не задан CRON_SECRET.", 403);
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return fail("UNAUTHORIZED", "Неверный ключ плановой задачи.", 401);
  try {
    const byMode: Record<string, unknown> = {};
    for (const mode of DATA_MODES) {
      if (mode === "demo" && !(await demoWorkspaceReady())) continue;
      byMode[mode] = await runWithDataMode(mode, () => processNotificationDeliveries());
    }
    return ok(byMode);
  } catch (error) {
    logger.error("job.notifications.failed", { error });
    return fail("INTERNAL_ERROR", "Ошибка выполнения задачи.", 500);
  }
}
