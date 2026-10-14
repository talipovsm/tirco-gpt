/** Предел тела вебхука по умолчанию: 1 МБ (пакет показаний телематики помещается с большим запасом). */
export const WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;

/**
 * Чтение сырого тела запроса с ограничением размера (SEC-09): при превышении чтение прерывается,
 * а не загружает тело целиком в память. Content-Length проверяется заранее, но не считается достаточным —
 * поток считается побайтно.
 */
export async function readRawBody(
  req: Request,
  maxBytes = WEBHOOK_MAX_BODY_BYTES,
): Promise<{ ok: true; text: string } | { ok: false; reason: "too-large" }> {
  const declared = Number(req.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too-large" };
  if (!req.body) return { ok: true, text: "" };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "too-large" };
    }
    chunks.push(value);
  }
  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
}
