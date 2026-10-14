import { z } from "zod";
import { parseJson, route } from "@/lib/api/handler";
import { verifyEmail } from "@/server/services/auth.service";

const schema = z.object({ token: z.string().min(10, "Ссылка недействительна") });

/** Подтверждение email по ссылке из письма (SEC-04). */
export const POST = route({ auth: false }, async ({ req, meta }) => verifyEmail((await parseJson(req, schema)).token, meta));
