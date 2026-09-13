import { expect, test } from "@playwright/test";
import { createTestAccount, expectSignedOut, signInTestAccount } from "./account-helpers";

/* Test account mutations, device isolation, and closure through the browser. */
test.describe("account settings", () => {
  test("keeps renamed usernames synchronized and rejects reserved names", async ({ page, browser }) => {
    const account = await createTestAccount(page);
    const otherContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    try {
      const otherPage = await otherContext.newPage();
      const otherAccount = await createTestAccount(otherPage);
      const username = page.getByRole("region", { name: "Profile", exact: true }).getByLabel("Username");
      await username.fill(otherAccount.username.toUpperCase());
      await page.getByRole("button", { name: "Save username" }).click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText("Username is already registered.");
      await expect(page.getByRole("heading", { name: account.username, exact: true })).toBeVisible();

      const renamed = `${account.username}-new`;
      await username.fill(renamed);
      await page.getByRole("button", { name: "Save username" }).click();
      await expect(page.getByRole("status")).toHaveText("Username updated.");
      await expect(page.getByRole("heading", { name: renamed, exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: renamed, exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Profile", exact: true }).getByLabel("Username")).toHaveValue(renamed);
      const session = await page.request.get("/api/auth/get-session");
      expect((await session.json()).user.name).toBe(renamed);
    } finally {
      await otherContext.close();
    }
  });

  test("requires the current password and signs out other devices after a password change", async ({ page, browser }) => {
    const account = await createTestAccount(page);
    const otherContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    try {
      const otherPage = await otherContext.newPage();
      await signInTestAccount(otherPage, account);
      const passwordForm = page.getByRole("region", { name: "Password", exact: true });
      await passwordForm.getByLabel("Current password", { exact: true }).fill("Wrong-password-123");
      await passwordForm.getByLabel("New password", { exact: true }).fill("New-browser-password-456");
      await passwordForm.getByLabel("Confirm new password", { exact: true }).fill("Different-password-456");
      await page.getByRole("button", { name: "Change password", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText("New passwords do not match.");

      await passwordForm.getByLabel("Confirm new password", { exact: true }).fill("New-browser-password-456");
      await page.getByRole("button", { name: "Change password", exact: true }).click();
      await expect(page.getByRole("main").getByRole("alert")).toHaveText("Invalid password");
      const otherSession = await otherPage.request.get("/api/auth/get-session");
      expect((await otherSession.json()).user.email).toBe(account.email);

      await passwordForm.getByLabel("Current password", { exact: true }).fill(account.password);
      await expect(passwordForm.getByRole("checkbox", { name: "Sign out other devices" })).toBeChecked();
      await page.getByRole("button", { name: "Change password", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Password changed.");
      await expect(passwordForm.getByLabel("Current password", { exact: true })).toHaveValue("");
      await expect(page.getByRole("heading", { name: account.username, exact: true })).toBeVisible();
      await expectSignedOut(otherPage);

      await otherPage.getByLabel("Email").fill(account.email);
      await otherPage.getByLabel("Password", { exact: true }).fill(account.password);
      await otherPage.getByRole("main").getByRole("button", { name: "Log In", exact: true }).click();
      await expect(otherPage.getByText("Invalid email or password", { exact: true })).toBeVisible();
      await signInTestAccount(otherPage, { ...account, password: "New-browser-password-456" });

      /* Opting out keeps the other device signed in. */
      await passwordForm.getByLabel("Current password", { exact: true }).fill("New-browser-password-456");
      await passwordForm.getByLabel("New password", { exact: true }).fill("Final-browser-password-789");
      await passwordForm.getByLabel("Confirm new password", { exact: true }).fill("Final-browser-password-789");
      await passwordForm.getByRole("checkbox", { name: "Sign out other devices" }).uncheck();
      await page.getByRole("button", { name: "Change password", exact: true }).click();
      await expect(passwordForm.getByLabel("Current password", { exact: true })).toHaveValue("");
      await expect(page.getByRole("status")).toHaveText("Password changed.");
      const retainedSession = await otherPage.request.get("/api/auth/get-session", {
        params: { disableCookieCache: "true" },
      });
      expect((await retainedSession.json()).user.email).toBe(account.email);
    } finally {
      await otherContext.close();
    }
  });

  test("shows logout failures without losing account access and allows retry", async ({ page }) => {
    const account = await createTestAccount(page);
    await page.route("**/api/auth/sign-out", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Sign out unavailable. Please try again." }),
    }));
    const logout = page.getByRole("main").getByRole("button", { name: "Log Out", exact: true });
    await logout.click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Sign out unavailable. Please try again.");
    await expect(page.getByRole("heading", { name: account.username, exact: true })).toBeVisible();
    await page.unroute("**/api/auth/sign-out");
    await logout.click();
    await expectSignedOut(page);
  });

  test("signs out individual and remaining sessions without affecting another account", async ({ page, browser }) => {
    const account = await createTestAccount(page);
    const contexts = await Promise.all(Array.from({ length: 3 }, () => browser.newContext({ baseURL: test.info().project.use.baseURL })));
    try {
      const [secondPage, thirdPage, unrelatedPage] = await Promise.all(contexts.map((context) => context.newPage()));
      await signInTestAccount(secondPage, account);
      await signInTestAccount(thirdPage, account);
      const unrelated = await createTestAccount(unrelatedPage);
      await page.reload();
      const sessions = page.getByRole("region", { name: "Active sessions", exact: true });
      await expect(sessions.getByRole("listitem")).toHaveCount(3);
      await expect(sessions.getByText("This device", { exact: true })).toHaveCount(1);
      await sessions.getByRole("button", { name: "Sign out session", exact: true }).first().click();
      await expect(page.getByRole("status")).toHaveText("Session signed out.");
      await expect(sessions.getByRole("listitem")).toHaveCount(2);
      await sessions.getByRole("button", { name: "Sign out other sessions", exact: true }).click();
      await expect(page.getByRole("status")).toHaveText("Other sessions signed out.");
      await expect(sessions.getByRole("listitem")).toHaveCount(1);
      await expectSignedOut(secondPage);
      await expectSignedOut(thirdPage);
      const unrelatedSession = await unrelatedPage.request.get("/api/auth/get-session");
      expect((await unrelatedSession.json()).user.email).toBe(unrelated.email);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test("requires password proof and explicit confirmation before permanently closing an account", async ({ page, browser }) => {
    const account = await createTestAccount(page);
    const otherContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    try {
      const otherPage = await otherContext.newPage();
      await signInTestAccount(otherPage, account);
      await page.getByRole("button", { name: "Delete account", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Confirm deletion" })).toBeDisabled();
      await dialog.getByLabel("Confirm current password").fill("Wrong-password-123");
      await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
      await dialog.getByRole("button", { name: "Confirm deletion" }).click();
      await expect(dialog.getByRole("alert")).toHaveText("Invalid password");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("button", { name: "Delete account", exact: true }).click();
      await expect(dialog.getByLabel("Confirm current password")).toHaveValue("");
      await expect(dialog.getByLabel("Type DELETE to confirm")).toHaveValue("");
      await dialog.getByLabel("Confirm current password").fill(account.password);
      await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
      await dialog.getByRole("button", { name: "Confirm deletion" }).click();
      await expect(page.getByRole("heading", { name: "Log In", exact: true })).toBeVisible();
      await expect(page.getByText("Account closed.", { exact: true })).toBeVisible();
      await expectSignedOut(otherPage);
      await otherPage.getByLabel("Email").fill(account.email);
      await otherPage.getByLabel("Password", { exact: true }).fill(account.password);
      await otherPage.getByRole("main").getByRole("button", { name: "Log In", exact: true }).click();
      await expect(otherPage.getByText("Invalid email or password", { exact: true })).toBeVisible();
    } finally {
      await otherContext.close();
    }
  });

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`fits account settings and confirmation at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await createTestAccount(page);
      await expect(page.getByRole("region", { name: "Active sessions", exact: true }).getByText("This device", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("account-settings.png"), fullPage: true });
      await page.getByRole("button", { name: "Delete account", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1);
      await expect(dialog.getByLabel("Confirm current password")).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath("account-confirmation.png") });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
});
