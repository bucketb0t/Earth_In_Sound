import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * End-to-end coverage for the persistent responsive navbar.
 *
 * Scope: layout selection, navigation, input methods, route-derived state,
 * animation state, cell alignment, overflow, and breakpoint persistence.
 * Exact artwork pixels are intentionally outside this file's scope because
 * the artwork is still being tuned independently from navbar behavior.
 */

/* Representative viewport sizes for each navbar layout. */
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const COMPACT_VIEWPORT = { width: 390, height: 844 };
const NAVBAR_ACCESSIBLE_NAME = "Earth In Sound site navigation";

type NavbarLayout = "wide" | "compact";

interface NavigationCase {
  controlName: string;
  expectedPathname: string;
}

/*
 * Every primary-section control that should navigate when pressed. Keeping
 * this matrix in one place makes it difficult to accidentally omit a link.
 */
const SECTION_NAVIGATION_CASES: readonly NavigationCase[] = [
  { controlName: "Earth In Sound, go to home", expectedPathname: "/" },
  { controlName: "Navigate to Home", expectedPathname: "/" },
  { controlName: "Navigate to About", expectedPathname: "/about" },
  { controlName: "Navigate to Contact", expectedPathname: "/contact" },
  {
    controlName: "Jason Walton, go to Biography",
    expectedPathname: "/jason-walton/biography",
  },
  {
    controlName: "Jason Walton: Biography",
    expectedPathname: "/jason-walton/biography",
  },
  {
    controlName: "Jason Walton: Discography",
    expectedPathname: "/jason-walton/discography",
  },
  {
    controlName: "Jason Walton: Production",
    expectedPathname: "/jason-walton/production",
  },
  {
    controlName: "I Hate Music, go to Podcast",
    expectedPathname: "/i-hate-music/podcast",
  },
  {
    controlName: "I Hate Music: Podcast",
    expectedPathname: "/i-hate-music/podcast",
  },
  {
    controlName: "I Hate Music: Community",
    expectedPathname: "/i-hate-music/community",
  },
  {
    controlName: "I Hate Music: Patreon",
    expectedPathname: "/i-hate-music/patreon",
  },
] as const;

/* Wait for Next.js client navigation and verify the resulting route. */
async function expectPathname(page: Page, expectedPathname: string) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(expectedPathname);
}

/*
 * Open the starting page and return the two navbar locators shared by most
 * tests. This also confirms that the expected responsive layout is ready.
 */
async function openNavbar(page: Page, expectedLayout: NavbarLayout) {
  await page.goto("/");

  const navigation = page.getByRole("navigation", {
    name: NAVBAR_ACCESSIBLE_NAME,
  });
  const navbarShell = page.locator("[data-navbar-layout]");

  await expect(navigation).toBeVisible();
  await expect(navbarShell).toHaveAttribute(
    "data-navbar-layout",
    expectedLayout,
  );

  return { navigation, navbarShell };
}

/* Confirm that a row's outside left and right spaces are visually balanced. */
async function expectCellSpanCentered(
  page: Page,
  firstCell: Locator,
  lastCell: Locator,
): Promise<void> {
  const [firstCellBox, lastCellBox, viewportWidth] = await Promise.all([
    firstCell.boundingBox(),
    lastCell.boundingBox(),
    page.evaluate(() => document.documentElement.clientWidth),
  ]);

  if (!firstCellBox || !lastCellBox) {
    throw new Error("Navbar cell geometry could not be measured.");
  }

  const leftMargin = firstCellBox.x;
  const rightMargin = viewportWidth - (lastCellBox.x + lastCellBox.width);

  expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(1.5);
}

/* Guard against any navbar rule making the complete page wider than its viewport. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const pageWidth = await page.evaluate(() => ({
    visibleWidth: document.documentElement.clientWidth,
    completeWidth: document.documentElement.scrollWidth,
  }));

  expect(pageWidth.completeWidth).toBeLessThanOrEqual(
    pageWidth.visibleWidth + 1,
  );
}

/*
 * Check the shared geometry contract. Wide mode uses one six-cell row, while
 * compact mode checks its three-cell primary and utility rows separately.
 */
async function expectNavbarGeometry(
  page: Page,
  layout: NavbarLayout,
): Promise<void> {
  const primaryCells = page.locator('[data-navbar-row="primary"] > *');
  const utilityCells = page.locator('[data-navbar-row="utility"] > *');

  await expect(primaryCells).toHaveCount(3);
  await expect(utilityCells).toHaveCount(3);

  if (layout === "wide") {
    await expectCellSpanCentered(page, primaryCells.first(), utilityCells.last());
  } else {
    await expectCellSpanCentered(page, primaryCells.first(), primaryCells.last());
    await expectCellSpanCentered(page, utilityCells.first(), utilityCells.last());
  }

  await expectNoHorizontalOverflow(page);
}

/*
 * Reproduce a held pointer moving vertically across a slider or knob. This
 * covers mouse dragging and the pointer-capture behavior also used by touch.
 */
async function dragControlVertically(
  page: Page,
  control: Locator,
  verticalDistance: number,
): Promise<void> {
  const controlBox = await control.boundingBox();
  if (!controlBox) {
    throw new Error("Navbar drag control geometry could not be measured.");
  }

  const centerX = controlBox.x + controlBox.width / 2;
  const centerY = controlBox.y + controlBox.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX, centerY + verticalDistance, { steps: 5 });
  await page.mouse.up();
}

/* Desktop-only rendering and interaction behavior. */
test.describe("desktop navbar", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  /* Scope: wide layout selection and visibility of its main destinations. */
  test("renders the wide layout and its primary controls", async ({ page }) => {
    const { navigation } = await openNavbar(page, "wide");

    await expect(
      navigation.getByRole("button", {
        name: "Earth In Sound, go to home",
      }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Store" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Shopping cart" }),
    ).toBeVisible();
  });

  /* Scope: six-cell desktop alignment and horizontal page overflow. */
  test("keeps the wide cell row centered without overflow", async ({ page }) => {
    await openNavbar(page, "wide");
    await expectNavbarGeometry(page, "wide");
  });

  /* Scope: accessible keyboard operation for the slider and rotary knob. */
  test("supports slider and knob keyboard controls", async ({ page }) => {
    const { navigation } = await openNavbar(page, "wide");
    const eisSlider = navigation.getByRole("slider", {
      name: "Earth In Sound section slider",
    });

    await eisSlider.press("End");
    await expectPathname(page, "/contact");
    await expect(eisSlider).toHaveAttribute("aria-valuenow", "2");
    await expect(eisSlider).toHaveAttribute("aria-valuetext", "Contact");

    await eisSlider.press("Home");
    await expectPathname(page, "/");
    await expect(eisSlider).toHaveAttribute("aria-valuenow", "0");

    const jasonKnob = navigation.getByRole("button", {
      name: "Jason Walton knob",
    });

    await jasonKnob.press("Enter");
    await expectPathname(page, "/jason-walton/biography");
    await expect(jasonKnob).toHaveAttribute("aria-pressed", "true");

    await jasonKnob.press("Space");
    await expectPathname(page, "/jason-walton/discography");
  });

  /* Scope: held-pointer dragging and the route selected by each control. */
  test("supports pointer dragging on the slider and shared knob", async ({
    page,
  }) => {
    const { navigation } = await openNavbar(page, "wide");
    const eisSlider = navigation.getByRole("slider", {
      name: "Earth In Sound section slider",
    });

    await dragControlVertically(page, eisSlider, 200);
    await expectPathname(page, "/contact");
    await expect(eisSlider).toHaveAttribute("aria-valuenow", "2");

    await page.goto("/");
    const jasonKnob = navigation.getByRole("button", {
      name: "Jason Walton knob",
    });

    await dragControlVertically(page, jasonKnob, 40);
    await expectPathname(page, "/jason-walton/production");
    await expect(
      navigation.getByRole("button", { name: "Jason Walton: Production" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

/* Phone-sized rendering, hit targets, navigation, and visual state. */
test.describe("compact navbar", () => {
  test.use({ viewport: COMPACT_VIEWPORT });

  /* Scope: compact layout selection and visibility of its main destinations. */
  test("renders the compact layout on a phone-sized viewport", async ({
    page,
  }) => {
    const { navigation } = await openNavbar(page, "compact");

    await expect(
      navigation.getByRole("button", {
        name: "Earth In Sound, go to home",
      }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Store" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Shopping cart" }),
    ).toBeVisible();
  });

  /* Scope: independent alignment of both compact rows and page overflow. */
  test("keeps both compact rows centered without overflow", async ({ page }) => {
    await openNavbar(page, "compact");
    await expectNavbarGeometry(page, "compact");
  });

  /* Scope: every logo, text choice, LED row, and mobile section hit target. */
  test("navigates from every section control and mobile hit target", async ({
    page,
  }) => {
    const { navigation } = await openNavbar(page, "compact");

    for (const navigationCase of SECTION_NAVIGATION_CASES) {
      await test.step(navigationCase.controlName, async () => {
        await page.goto("/");
        const control = navigation.getByRole("button", {
          name: navigationCase.controlName,
          exact: true,
        });

        await expect(control).toBeVisible();
        await control.click();
        await expectPathname(page, navigationCase.expectedPathname);
      });
    }
  });

  /* Scope: all logged-out controls in the Account, Store, and Cart cells. */
  test("navigates from all logged-out Account, Store, and Cart controls", async ({
    page,
  }) => {
    const { navigation } = await openNavbar(page, "compact");

    await test.step("account switch", async () => {
      const accountSwitch = navigation.getByRole("switch", { name: "LogIn" });
      await expect(accountSwitch).toBeEnabled();
      await accountSwitch.click();
      await expectPathname(page, "/account");
    });

    await test.step("login status panel", async () => {
      await page.goto("/");
      const loginPanel = navigation.getByRole("button", {
        name: "LogIn",
        exact: true,
      });
      await expect(loginPanel).toBeEnabled();
      await loginPanel.click();
      await expectPathname(page, "/account");
    });

    await test.step("sign-up display", async () => {
      await page.goto("/");
      await navigation.getByRole("button", { name: "Sign up" }).click();
      await expectPathname(page, "/account");
    });

    await test.step("Store", async () => {
      await page.goto("/");
      await navigation.getByRole("button", { name: "Store" }).click();
      await expectPathname(page, "/store");
    });

    await test.step("Cart", async () => {
      await page.goto("/");
      await navigation.getByRole("button", { name: "Shopping cart" }).click();
      await expectPathname(page, "/cart");
    });
  });

  /* Scope: accessible selected states derived from the currently active route. */
  test("reports route-derived slider, knob, and utility states", async ({
    page,
  }) => {
    const { navigation } = await openNavbar(page, "compact");
    const store = navigation.getByRole("button", { name: "Store" });
    const cart = navigation.getByRole("button", { name: "Shopping cart" });

    await page.goto("/about");
    await expect(
      navigation.getByRole("button", { name: "Navigate to About" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation.getByRole("slider", {
        name: "Earth In Sound section slider",
      }),
    ).toHaveAttribute("aria-valuetext", "About");

    await page.goto("/jason-walton/discography");
    await expect(
      navigation.getByRole("button", { name: "Jason Walton: Discography" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation.getByRole("button", { name: "Jason Walton knob" }),
    ).toHaveAttribute("aria-pressed", "true");

    await store.click();
    await expectPathname(page, "/store");
    await expect(store).toHaveAttribute("aria-pressed", "true");
    await expect(cart).toHaveAttribute("aria-pressed", "false");

    await cart.click();
    await expectPathname(page, "/cart");
    await expect(cart).toHaveAttribute("aria-pressed", "true");
    await expect(store).toHaveAttribute("aria-pressed", "false");
    await expect(navigation.getByLabel("1 items in cart")).toContainText("01");

    await page.goto("/");
    await expect(
      navigation.getByRole("switch", { name: "LogIn" }),
    ).toHaveAttribute("aria-checked", "false");
    await expect(
      navigation.getByRole("button", { name: "Sign up" }),
    ).toBeVisible();
  });

  /* Scope: Store artwork visibility while hovered and while selected. */
  test("runs the Store hover and pressed visual states", async ({ page }) => {
    const { navigation } = await openNavbar(page, "compact");
    const store = navigation.getByRole("button", { name: "Store" });
    const hoverVideo = store.locator("video").first();
    const pressedVideo = store.locator("video").nth(1);

    await store.hover();
    await expect
      .poll(() => hoverVideo.evaluate((video) => getComputedStyle(video).opacity))
      .toBe("1");

    await store.click();
    await expectPathname(page, "/store");
    await expect
      .poll(() =>
        pressedVideo.evaluate((video) => getComputedStyle(video).opacity),
      )
      .toBe("1");
    await expect(store).toHaveAttribute("aria-pressed", "true");
  });
});

/* Behavior at the single boundary between compact and wide layouts. */
test.describe("navbar breakpoint", () => {
  test.use({ viewport: { width: 1025, height: 800 } });

  /*
   * Scope: exact 1024/1025 switching, recentering, and preservation of the
   * existing navbar DOM tree instead of remounting controls during resizing.
   */
  test("switches and recenters exactly between 1024px and 1025px", async ({
    page,
  }) => {
    const { navigation, navbarShell } = await openNavbar(page, "wide");
    const eisLogo = navigation.getByRole("button", {
      name: "Earth In Sound, go to home",
    });

    await eisLogo.evaluate((element) => {
      element.setAttribute("data-e2e-instance", "preserved");
    });
    await expectNavbarGeometry(page, "wide");

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(navbarShell).toHaveAttribute("data-navbar-layout", "compact");
    await expect(eisLogo).toHaveAttribute("data-e2e-instance", "preserved");
    await expectNavbarGeometry(page, "compact");

    await page.setViewportSize({ width: 1025, height: 800 });
    await expect(navbarShell).toHaveAttribute("data-navbar-layout", "wide");
    await expect(eisLogo).toHaveAttribute("data-e2e-instance", "preserved");
    await expectNavbarGeometry(page, "wide");
  });
});
