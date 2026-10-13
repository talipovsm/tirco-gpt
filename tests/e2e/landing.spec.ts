import { expect, test } from "@playwright/test";

test("публичная главная: доступна без входа, ведёт на вход и регистрацию", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Грузы, перевозчики и логистика");
  await expect(page).toHaveTitle(/TIRCO/);

  await page.getByRole("link", { name: "Начать работу" }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Войти в систему" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("публичная главная: мобильное меню открывается и закрывается", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  const menu = page.getByRole("navigation", { name: "Разделы" }).last();
  await expect(menu.getByRole("link", { name: "FAQ" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeVisible();
  await context.close();
});
