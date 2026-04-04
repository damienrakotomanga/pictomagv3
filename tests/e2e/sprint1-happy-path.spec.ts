import { expect, test } from "@playwright/test";

function createSprint1Identity() {
  const nonce = `${Date.now()}${Math.trunc(Math.random() * 100_000)}`;

  return {
    email: `playwright-sprint1-${nonce}@pictomag.test`,
    password: "playwright-sprint1-password",
    displayName: `Playwright Sprint ${nonce.slice(-4)}`,
    username: `sprint${nonce}`.slice(0, 24),
    postTitle: `Sprint 1 post ${nonce.slice(-6)}`,
    postBody: `Premier post Sprint 1 ${nonce}`,
  };
}

test.describe("Sprint 1 happy path", () => {
  test("signup -> onboarding -> profile -> compose -> feed", async ({ page }) => {
    const identity = createSprint1Identity();

    await page.goto("/auth");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/signup");
    await page.getByPlaceholder("toi@pictomag.com").fill(identity.email);
    await page.getByPlaceholder("8 caracteres minimum").fill(identity.password);
    await page.getByPlaceholder("Repete le mot de passe").fill(identity.password);
    await page.getByPlaceholder("Axel Belujon").fill(identity.displayName);
    await page.getByPlaceholder("axelbelujon").fill(identity.username);
    await page.getByRole("button", { name: "Creer mon compte" }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByPlaceholder("Damien Rakotomanga", { exact: true }).fill(identity.displayName);
    await page.getByPlaceholder("damien", { exact: true }).fill(identity.username);
    await page.getByPlaceholder("Creatif, stories, visuels, videos, editions, projets.").fill(
      "Profil Sprint 1 configure depuis le test principal.",
    );
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    const firstPostButton = page.getByRole("button", { name: "Creer mon premier post" });
    await expect(firstPostButton).toBeVisible();
    await firstPostButton.click();

    await expect(page).toHaveURL(/\/compose$/);
    await page.getByRole("button", { name: "Ecrire un post texte" }).click();
    await page.getByPlaceholder("Donne un vrai titre a ton post").fill(identity.postTitle);
    await page.getByPlaceholder("Ecris ton texte ici...").fill(identity.postBody);
    await page.locator("#post-composer-form").getByRole("button", { name: "Partager" }).click();

    await expect(page).toHaveURL(/\/\?mode=classic$/);
    await expect(page.getByText(identity.postTitle)).toBeVisible();

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText(identity.postTitle)).toBeVisible();
  });
});
