import { expect, test } from "@playwright/test";

/*
 * Browser coverage for the currently implemented account surface. The test
 * server uses a disposable database, so these checks can safely exercise both
 * form behavior and the complete authentication path.
 */
test.describe("account page", () => {
  test("switches cleanly between login and signup modes", async ({ page }) => {
    await page.goto("/account");

    await expect(page).toHaveTitle("Account | Earth In Sound");
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    await expect(page.getByLabel("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    await expect(page.getByLabel("Username")).toHaveCount(0);

    await page.getByRole("button", { name: "Need an account?" }).click();

    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    await expect(
      page.getByRole("button", { name: "Create Account" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Already have an account?" })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  });

  test("exposes the intended browser-side field constraints", async ({ page }) => {
    await page.goto("/account");

    const email = page.getByLabel("Email");
    const password = page.getByLabel("Password");
    await expect(email).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("type", "email");
    await expect(password).toHaveAttribute("required", "");
    await expect(password).toHaveAttribute("minlength", "8");
    await expect(password).toHaveAttribute("maxlength", "128");

    await page.getByRole("button", { name: "Need an account?" }).click();
    await expect(page.getByLabel("Username")).toHaveAttribute("required", "");
  });

  /*
   * Scope: complete browser-to-database authentication flow. The Playwright
   * server uses a disposable database, so this never creates a real account.
   */
  test("creates an account, signs out, and signs back in", async ({ page }) => {
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const username = `e2e-${uniqueSuffix}`;
    const email = `${username}@example.com`;
    const password = "E2e-test-password-123";

    await page.goto("/account");
    await page.getByRole("button", { name: "Need an account?" }).click();
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByRole("heading", { name: username, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Log Out" }),
    ).toHaveAttribute("aria-checked", "true");

    await page
      .getByRole("main")
      .getByRole("button", { name: "Log Out" })
      .click();
    await expect(page.getByText("Signed out.", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "LogIn" }),
    ).toHaveAttribute("aria-checked", "false");

    await page
      .getByRole("button", { name: "Already have an account?" })
      .click();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Wrong-password-123");
    await page
      .getByRole("main")
      .getByRole("button", { name: "Log In" })
      .click();

    await expect(
      page.getByText("Invalid email or password", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "LogIn" }),
    ).toHaveAttribute("aria-checked", "false");

    await page.getByLabel("Password").fill(password);
    await page
      .getByRole("main")
      .getByRole("button", { name: "Log In" })
      .click();

    await expect(
      page.getByRole("heading", { name: username, exact: true }),
    ).toBeVisible();
  });
});
