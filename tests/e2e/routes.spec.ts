import { expect, test } from "@playwright/test";

interface RouteCase {
  path: string;
  heading: string;
  title: string;
}

/* Routes with implemented content contracts. */
const ROUTE_CASES: readonly RouteCase[] = [
  { path: "/about", heading: "About", title: "About | Earth In Sound" },
  {
    path: "/contact",
    heading: "Contact",
    title: "Contact | Earth In Sound",
  },
  {
    path: "/jason-walton/biography",
    heading: "Biography",
    title: "Jason W. Walton Biography | Earth In Sound",
  },
  {
    path: "/jason-walton/discography",
    heading: "Discography",
    title: "Jason W. Walton Discography | Earth In Sound",
  },
  {
    path: "/jason-walton/production",
    heading: "Production",
    title: "Jason W. Walton Production | Earth In Sound",
  },
  {
    path: "/i-hate-music/community",
    heading: "Community",
    title: "I Hate Music Community | Earth In Sound",
  },
  {
    path: "/i-hate-music/patreon",
    heading: "Patreon",
    title: "I Hate Music Patreon | Earth In Sound",
  },
  { path: "/store", heading: "Store", title: "Store | Earth In Sound" },
  { path: "/cart", heading: "Cart", title: "Cart | Earth In Sound" },
] as const;

/* Test placeholder content and metadata pending final designs. */
test("renders every current section route without a server error", async ({
  page,
}) => {
  for (const routeCase of ROUTE_CASES) {
    await test.step(routeCase.path, async () => {
      const response = await page.goto(routeCase.path);

      expect(response?.ok()).toBe(true);
      await expect(
        page.getByRole("heading", { name: routeCase.heading, exact: true }),
      ).toBeVisible();
      await expect(page).toHaveTitle(routeCase.title);
    });
  }
});

/* Test podcast headings with live RSS or the fallback. */
test("keeps the podcast route renderable when its feed is available or down", async ({
  page,
}) => {
  const response = await page.goto("/i-hate-music/podcast");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: /I Hate Music/i }).first(),
  ).toBeVisible();
  await expect(page).toHaveTitle("I Hate Music Podcast | Earth In Sound");
});
