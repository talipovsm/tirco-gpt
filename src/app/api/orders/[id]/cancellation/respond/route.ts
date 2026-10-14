import { parseJson, route } from "@/lib/api/handler";
import { cancellationResponseSchema } from "@/lib/validation/order";
import { respondToCancellation } from "@/server/services/order-cancellation.service";

/** Согласиться (с паролем) или отклонить предложение отмены другой стороны. */
export const POST = route<{ id: string }>(
  { idempotency: "order.cancellation.respond", rateLimit: "critical" },
  async ({ req, actor, params }) => respondToCancellation(actor, params.id, await parseJson(req, cancellationResponseSchema)),
);
