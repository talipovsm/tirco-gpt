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
