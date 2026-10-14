/**
 * Next.js вызывает register() один раз при старте сервера. Код для Node.js (планировщик задач, проверки конфигурации)
 * вынесен в instrumentation-node.ts и подключается только в Node.js-рантайме — так он не попадает в edge-сборку.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}

/**
 * Ошибки, перехваченные сервером Next.js (рендер страниц, серверные действия, обработчики маршрутов вне route()),
 * пишутся в лог и уходят оповещением (OPS-06). Из запроса берутся только путь и метод: заголовки могут
 * содержать cookie сессии.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const { logger } = await import("./lib/logger");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  logger.error("request.error", {
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    digest,
    error:
      err instanceof Error ? { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6).join("\n") } : String(err),
  });
}
