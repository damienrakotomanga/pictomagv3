import { expect, test } from "@playwright/test";
import { completeCreatorSignup, createCreatorIdentity, createPostViaApi } from "./helpers/creator-flow";

test.describe("Post detail flow", () => {
  test("opens a real post detail page from the classic feed", async ({ page }) => {
    const identity = createCreatorIdentity("playwright-post-detail");
    await completeCreatorSignup(page, identity);

    const post = await createPostViaApi(page.request, {
      surface: "classic",
      kind: "letter",
      title: `Post detail ${Date.now()}`,
      body: "Lecture detaillee du post depuis le feed reel.",
      media: [],
    });

    await page.goto("/?mode=classic");

    const postCard = page.locator("article").filter({ has: page.getByRole("button", { name: post.title }) }).first();
    await expect(postCard).toBeVisible();
    await postCard.getByRole("button", { name: post.title }).click();

    await expect(page).toHaveURL(new RegExp(`/posts/${post.id}$`));
    await expect(page.locator("h1").filter({ hasText: post.title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voir le profil" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour au feed" })).toBeVisible();
    await expect(page.getByText("Lecture du post")).toBeVisible();
  });
});
