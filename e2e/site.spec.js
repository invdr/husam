import { expect, test } from "@playwright/test";

test("главная страница показывает ключевые блоки и ссылки на документы", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("heading", { name: /свяжитесь с нами/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /политика обработки персональных данных/i })
      .first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /согласие на обработку персональных данных/i })
      .first()
  ).toBeVisible();
});

test("юридические страницы доступны напрямую", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", {
      name: /политика в отношении обработки персональных данных/i,
    })
  ).toBeVisible();

  await page.goto("/consent");
  await expect(
    page.getByRole("heading", {
      name: /согласие на обработку персональных данных/i,
    })
  ).toBeVisible();
});

test("форма контактов не отправляется без согласия", async ({ page }) => {
  await page.goto("/#contacts");

  const form = page.locator("form").filter({ hasText: /отправить заявку/i });
  await form.getByPlaceholder("Ваше имя").fill("Иван");
  await form.getByPlaceholder("Телефон").fill("+7 999 123 45 67");
  await form.getByRole("combobox").selectOption({ label: "Строительство" });
  await form.getByRole("button", { name: /отправить заявку/i }).click();

  await expect(form.locator("#contact-consent")).toHaveClass(/form-error/);
});

test("квиз не отправляется без согласия", async ({ page }) => {
  await page.goto("/#calculator");

  const calculator = page.locator("#calculator");
  await calculator.getByRole("button", { name: /^Строительство$/ }).click();
  await calculator.getByRole("button", { name: /далее/i }).click();
  await calculator.getByRole("button", { name: /^Дом под ключ$/ }).click();
  await calculator.getByRole("button", { name: /далее/i }).click();
  await calculator.getByRole("button", { name: /^Нет проекта$/ }).click();
  await calculator.getByRole("button", { name: /далее/i }).click();
  await calculator.getByRole("button", { name: /^До 3$/ }).click();
  await calculator.getByRole("button", { name: /далее/i }).click();
  await calculator.getByPlaceholder("Ваше имя").fill("Иван");
  await calculator.getByPlaceholder("+7 (___) ___-__-__").fill("+7 999 123 45 67");
  await calculator.getByRole("button", { name: /отправить/i }).click();

  await expect(
    calculator.getByText(/подтвердите согласие перед отправкой/i)
  ).toBeVisible();
});

