import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";

/**
 * Доступность ключевых экранов (UX-01, UX-02): контраст текста без нарушений axe уровня serious/critical
 * в светлой и тёмной теме и отсутствие горизонтальной прокрутки на телефоне.
 */
const AXE = readFileSync(path.join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");
const PASSWORD = "Demo1234!";

async function signIn(browser: Browser, email: string, opts: { colorScheme?: "light" | "dark"; width?: number } = {}) {
  const context = await browser.newContext({
    colorScheme: opts.colorScheme ?? "light",
    viewport: { width: opts.width ?? 1440, height: 900 },
    locale: "ru-RU",
  });
  const page = await context.newPage();
  await page.goto("/login");
  const origin = new URL(page.url()).origin;
  const res = await page.request.post("/api/auth/login", { headers: { origin }, data: { email, password: PASSWORD, dataMode: "real" } });
  expect(res.ok()).toBe(true);
  return { context, page };
}

async function contrastViolations(page: import("@playwright/test").Page) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    // @ts-expect-error axe внедряется в страницу
    const r = await window.axe.run(document, { runOnly: ["color-contrast"] });
    return (r.violations as { impact: string; nodes: { html: string }[] }[])
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .flatMap((v) => v.nodes.map((n) => n.html.slice(0, 120)));
  });
}

const PAGES: { email: string; paths: string[] }[] = [
  { email: "shipper@tirco.demo", paths: ["/dashboard", "/loads", "/orders", "/documents", "/finance"] },
  { email: "carrier@tirco.demo", paths: ["/dashboard", "/marketplace", "/vehicles"] },
];

for (const scheme of ["light", "dark"] as const) {
  test(`контраст текста на ключевых экранах (${scheme})`, async ({ browser }) => {
    for (const { email, paths } of PAGES) {
      const { context, page } = await signIn(browser, email, { colorScheme: scheme });
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        expect(await contrastViolations(page), `${email} ${path}`).toEqual([]);
      }
      await context.close();
    }
  });
}

test("нет горизонтальной прокрутки на телефоне (360 px)", async ({ browser }) => {
  const { context, page } = await signIn(browser, "shipper@tirco.demo", { width: 360 });
  await page.goto("/orders");
  const orderHref = await page
    .locator('a[href^="/orders/"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "").find((h) => /^\/orders\/[0-9a-f-]{36}/.test(h)));
  const paths = ["/dashboard", "/loads", "/loads/new", "/orders", ...(orderHref ? [orderHref.split("?")[0]] : [])];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await context.close();
  const driver = await signIn(browser, "driver@tirco.demo", { width: 360 });
  await driver.page.goto("/driver");
  const driverOverflow = await driver.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(driverOverflow, "/driver").toBeLessThanOrEqual(1);
  await driver.context.close();
});
