import { route } from "@/lib/api/handler";
import { withdrawCancellation } from "@/server/services/order-cancellation.service";

/** Отозвать своё предложение отмены. */
export const POST = route<{ id: string }>({ idempotency: "order.cancellation.withdraw" }, async ({ actor, params }) =>
  withdrawCancellation(actor, params.id),
);
