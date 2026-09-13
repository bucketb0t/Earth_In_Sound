import { expect, type Page } from "@playwright/test";

export interface TestAccount { username: string; email: string; password: string }

export async function createTestAccount(page: Page): Promise<TestAccount> {
  const username = `account-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const account = { username, email: `${username}@example.com`, password: "Browser-account-password-123" };
  await page.goto("/account");
  await page.getByRole("button", { name: "Need an account?" }).click();
  await page.getByLabel("Username", { exact: true }).fill(account.username);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("heading", { name: account.username, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Profile", exact: true })).toBeVisible();
  return account;
}

export async function signInTestAccount(page: Page, account: TestAccount) {
  await page.goto("/account");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("main").getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByRole("heading", { name: account.username, exact: true })).toBeVisible();
}

export async function expectSignedOut(page: Page) {
  const response = await page.request.get("/api/auth/get-session", { params: { disableCookieCache: "true" } });
  expect(await response.json()).toBeNull();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Log In", exact: true })).toBeVisible();
}
