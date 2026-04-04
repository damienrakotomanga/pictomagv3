import { expect, test } from "@playwright/test";

test.describe("Public auth portal", () => {
  test("redirects protected public routes to the login portal", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\?next=%2F$/);

    await page.goto("/marketplace");
    await expect(page).toHaveURL(/\/login\?next=%2Fmarketplace$/);

    await page.goto("/live-shopping");
    await expect(page).toHaveURL(/\/login\?next=%2Flive-shopping$/);
  });

  test("keeps a public profile visible but gates interactions behind auth", async ({ page }) => {
    await page.goto("/u/axelbelujon");

    await expect(page).toHaveURL(/\/u\/axelbelujon$/);
    await expect(page.getByRole("heading", { name: "Axel Belujon" })).toBeVisible();

    await page.getByRole("button", { name: "Videos" }).click();
    await expect(page.getByRole("heading", { name: "Ouvrir le profil complet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Creer un compte" })).toBeVisible();

    await page.getByRole("link", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fu%2Faxelbelujon$/);
  });
});
