import { parseJson, route } from "@/lib/api/handler";
import { cancellationProposalSchema } from "@/lib/validation/order";
import { getCancellationRequest, proposeCancellation } from "@/server/services/order-cancellation.service";

/** Действующее предложение отмены по соглашению сторон (или null). */
export const GET = route<{ id: string }>({}, async ({ actor, params }) => getCancellationRequest(actor, params.id));

/** Предложить отмену по соглашению сторон (BL-01). */
export const POST = route<{ id: string }>(
  { status: 201, idempotency: "order.cancellation.propose", rateLimit: "critical" },
  async ({ req, actor, params }) => proposeCancellation(actor, params.id, (await parseJson(req, cancellationProposalSchema)).reason),
);
