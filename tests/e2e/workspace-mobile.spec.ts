import { expect, test, type Page } from "@playwright/test";
import { navItems } from "@/components/layout/nav-config";

async function signIn(page: Page, email = "carrier@tirco.demo") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(/\/(dashboard|driver)$/);
}

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const width of [360, 390, 768]) {
  test(`операции на ${width}px: выбор, возврат, маршрут, документы и чат`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await signIn(page);
    await expect(page.getByTestId("shipment-row").first()).toBeVisible();
    await fitsViewport(page);
    await page.screenshot({ path: testInfo.outputPath(`operations-${width}.png`) });

    const tabs = page.getByRole("tablist", { name: "Разделы панели" });
    for (const name of [/Внимание/, /События/, /След/]) {
      await tabs.getByRole("tab", { name }).click();
      await expect(tabs.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
      await fitsViewport(page);
    }
    await tabs.getByRole("tab", { name: /Перевозки/ }).click();
    await page.getByTestId("workspace-view-map").click();
    await expect(page.getByRole("complementary", { name: "Карта и детали" })).toBeVisible();
    await page.getByTestId("workspace-view-list").click();

    await page.getByTestId("shipment-row").first().click();
    const sheet = page.getByTestId("workspace-detail-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("panel-open-order")).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`shipment-${width}.png`) });
    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("shipment-row").first()).toBeVisible();

    await page.getByTestId("shipment-row").first().click();
    await sheet.getByRole("button", { name: "Закрыть панель", exact: true }).click();
    await expect(sheet).toBeHidden();
    await page.getByTestId("shipment-row").first().click();
    await sheet.getByTestId("panel-open-order").click();
    await page.waitForURL(/\/orders\/[0-9a-f-]{36}$/);
    for (const [name, value] of [
      ["Маршрут", "route"],
      ["Документы", "documents"],
      ["Чат", "chat"],
    ]) {
      const tab = page.getByRole("tab", { name: new RegExp(`^${name}`) });
      await tab.click();
      await expect(tab).toHaveAttribute("data-state", "active");
      await expect(page).toHaveURL(new RegExp(`tab=${value}`));
      await fitsViewport(page);
    }
    await page.goBack();
    await expect(page.getByRole("tab", { name: /^Документы/ })).toHaveAttribute("data-state", "active");
  });
}

test("мобильное меню открывает каждый раздел перевозчика", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const nav = page.getByRole("navigation", { name: "Разделы", exact: true });
  for (const path of ["/marketplace", "/orders", "/messages", "/dashboard"]) {
    await nav.locator(`a[href="${path}"]`).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Страница не найдена");
    await fitsViewport(page);
  }
  for (const path of ["/next-load", "/vehicles", "/drivers", "/fuel", "/documents", "/finance", "/company"]) {
    await nav.getByRole("button", { name: "Ещё", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Все разделы" });
    await menu.locator(`a[href="${path}"]`).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    await expect(menu).toBeHidden();
    if (path === "/vehicles") {
      await page.getByTestId("fleet-row").first().click();
      await expect(page.getByRole("dialog", { name: "Автомобиль", exact: true })).toBeVisible();
      await page.goBack();
      await expect(page.getByRole("dialog", { name: "Автомобиль", exact: true })).toBeHidden();
    }
    await expect(page.getByRole("main")).not.toContainText("Страница не найдена");
    await fitsViewport(page);
  }
});

test("поиск на телефоне можно закрыть без клавиатуры; ошибка сервера видна", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signIn(page);
  await page.getByRole("button", { name: "Поиск и команды", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть поиск" }).click();
  await expect(page.getByTestId("command-input")).toBeHidden();
  await page.route("**/api/search?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Поиск временно недоступен." } }),
    }),
  );
  await page.getByRole("button", { name: "Поиск и команды", exact: true }).click();
  await page.getByTestId("command-input").fill("Алматы");
  await expect(page.getByRole("alert")).toContainText("Поиск временно недоступен");
  await fitsViewport(page);
});

test("операции на desktop сохраняют список и контекст рядом", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.getByTestId("shipment-row").first().click();
  await expect(page.getByTestId("shipment-list")).toBeVisible();
  await expect(page.getByTestId("shipment-panel")).toBeVisible();
  await expect(page.getByTestId("workspace-detail-sheet")).toHaveCount(0);
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("operations-desktop.png") });
});

for (const [kind, email] of [
  ["customer", "shipper@tirco.demo"],
  ["forwarder", "forwarder@tirco.demo"],
  ["driver", "driver@tirco.demo"],
] as const) {
  test(`мобильные переходы по роли ${kind}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, email);
    const nav = page.getByRole("navigation", { name: "Разделы", exact: true });
    for (const item of navItems(kind)) {
      if (item.primary) {
        await nav.locator(`a[href="${item.href}"]`).click();
      } else {
        await nav.getByRole("button", { name: "Ещё", exact: true }).click();
        await page.getByRole("dialog", { name: "Все разделы" }).locator(`a[href="${item.href}"]`).click();
      }
      await expect.poll(() => new URL(page.url()).pathname).toBe(item.href);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("main")).not.toContainText("Страница не найдена");
      await expect(page.getByRole("main")).not.toContainText("Произошла ошибка");
      await fitsViewport(page);
    }
  });
}
