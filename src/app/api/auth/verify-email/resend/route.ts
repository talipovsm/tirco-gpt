import { route } from "@/lib/api/handler";
import { resendEmailVerification } from "@/server/services/auth.service";

/** Повторная отправка ссылки подтверждения email. */
export const POST = route({ rateLimit: "critical" }, async ({ actor, meta }) => resendEmailVerification(actor, meta));
