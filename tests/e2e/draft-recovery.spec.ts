import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, dataMode: "real" | "demo" = "real") {
  const origin = new URL(page.url()).origin;
  const response = await page.request.post("/api/auth/login", {
    headers: { origin },
    data: { email, password: "Demo1234!", dataMode },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/loads/new");
}

test("неполный груз восстанавливается после обновления, а удаление начинает чистую форму", async ({ page }) => {
  await page.goto("/login");
  await login(page, "shipper@tirco.demo");
  const pickup = page.getByTestId("stop-0").getByLabel("Город");
  await pickup.fill("Урумчи — незавершённый маршрут");
  await expect(page.getByRole("status").filter({ hasText: "форма сохранена" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Есть незавершённый груз", { exact: true })).toBeVisible();
  await expect(pickup).toBeDisabled();
  await page.getByRole("button", { name: "Продолжить заполнение" }).click();
  await expect(pickup).toHaveValue("Урумчи — незавершённый маршрут");
  await page.getByRole("button", { name: "Начать заново" }).click();
  await expect(pickup).toHaveValue("");
  await page.reload();
  await expect(page.getByText("Есть незавершённый груз", { exact: true })).toHaveCount(0);
  await expect(pickup).toHaveValue("");
});

test("незавершённая форма изолирована между аккаунтами и режимами данных", async ({ page }) => {
  await page.goto("/login");
  await login(page, "shipper@tirco.demo");
  const pickup = page.getByTestId("stop-0").getByLabel("Город");
  await pickup.fill("Только для грузовладельца");
  await expect(page.getByRole("status").filter({ hasText: "форма сохранена" })).toBeVisible();
  await login(page, "forwarder@tirco.demo");
  await expect(pickup).toHaveValue("");
  await expect(page.getByText("Есть незавершённый груз", { exact: true })).toHaveCount(0);
  await login(page, "shipper@tirco.demo", "demo");
  await expect(pickup).toHaveValue("");
  await expect(page.getByText("Есть незавершённый груз", { exact: true })).toHaveCount(0);
  await login(page, "shipper@tirco.demo");
  await page.getByRole("button", { name: "Продолжить заполнение" }).click();
  await expect(pickup).toHaveValue("Только для грузовладельца");
});

test("ошибка хранилища показана явно и не мешает заполнять груз", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page.goto("/login");
  await login(page, "shipper@tirco.demo");
  const pickup = page.getByTestId("stop-0").getByLabel("Город");
  await pickup.fill("Алматы");
  await expect(page.getByRole("status").filter({ hasText: "Не удалось сохранить" })).toBeVisible();
  await expect(pickup).toBeEnabled();
  await expect(pickup).toHaveValue("Алматы");
});
