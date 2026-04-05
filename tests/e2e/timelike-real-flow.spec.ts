import { expect, test, type Locator, type Page } from "@playwright/test";

function createTimeLikeIdentity() {
  const nonce = `${Date.now()}${Math.trunc(Math.random() * 100_000)}`;

  return {
    email: `playwright-timelike-${nonce}@pictomag.test`,
    password: "playwright-timelike-password",
    displayName: `TimeLike ${nonce.slice(-4)}`,
    username: `timelike${nonce}`.slice(0, 24),
    postTitle: `TimeLike post ${nonce.slice(-6)}`,
    postBody: `TimeLike réel ${nonce}`,
  };
}

async function completeCreatorSetup(page: Page, identity: ReturnType<typeof createTimeLikeIdentity>) {
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
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole("button", { name: "Creer mon premier post" }).click();
  await expect(page).toHaveURL(/\/compose$/);
  await page.getByRole("button", { name: "Ecrire un post texte" }).click();
  await page.getByPlaceholder("Donne un vrai titre a ton post").fill(identity.postTitle);
  await page.getByPlaceholder("Ecris ton texte ici...").fill(identity.postBody);
  await page.locator("#post-composer-form").getByRole("button", { name: "Partager" }).click();
  await expect(page).toHaveURL(/\/\?mode=classic$/);
}

function getPostCard(page: Page, title: string) {
  return page.locator("article").filter({ has: page.getByRole("button", { name: title }) }).first();
}

function getTimeLikeButton(postCard: Locator) {
  return postCard.locator("button").filter({ hasText: "TimeLikes" }).first();
}

function getDislikeButton(postCard: Locator) {
  return postCard.locator("button").filter({ hasText: "Dislike" }).first();
}

test.describe("TimeLike real flow", () => {
  test("persists automatic TimeLike and removes it with dislike", async ({ page }) => {
    const identity = createTimeLikeIdentity();

    await completeCreatorSetup(page, identity);

    let postCard = getPostCard(page, identity.postTitle);
    await expect(postCard).toBeVisible();

    let timeLikeButton = getTimeLikeButton(postCard);
    await expect(timeLikeButton).toContainText("0");

    await page.waitForTimeout(8200);
    await expect(timeLikeButton).toContainText("1");

    await page.reload();
    postCard = getPostCard(page, identity.postTitle);
    await expect(postCard).toBeVisible();

    timeLikeButton = getTimeLikeButton(postCard);
    await expect(timeLikeButton).toContainText("1");

    const dislikeButton = getDislikeButton(postCard);
    await dislikeButton.click();
    await expect(postCard.getByText("Retirer ce TimeLike et stopper le signal auto sur ce post ?")).toBeVisible();
    await postCard.getByRole("button", { name: "Oui" }).click();
    await expect(timeLikeButton).toContainText("0");

    await page.reload();
    postCard = getPostCard(page, identity.postTitle);
    await expect(postCard).toBeVisible();
    await expect(getTimeLikeButton(postCard)).toContainText("0");
  });
});
