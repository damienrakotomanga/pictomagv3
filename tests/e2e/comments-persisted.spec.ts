import { expect, test } from "@playwright/test";
import { completeCreatorSignup, createCreatorIdentity, createPostViaApi } from "./helpers/creator-flow";

test.describe("Comments persisted flow", () => {
  test("keeps a new comment after reload", async ({ page }) => {
    const identity = createCreatorIdentity("playwright-comments");
    await completeCreatorSignup(page, identity);

    const post = await createPostViaApi(page.request, {
      surface: "classic",
      kind: "photo",
      title: `Comments persisted ${Date.now()}`,
      body: "On ouvre le drawer de commentaires avec une vraie persistance.",
      media: [
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-4.jpg",
          altText: "Photo commentaire persiste",
          position: 0,
        },
      ],
    });
    const commentBody = `Commentaire persiste ${Date.now()}`;

    await page.goto("/?mode=classic");

    let postCard = page.locator("article").filter({ has: page.getByRole("button", { name: post.title }) }).first();
    await expect(postCard).toBeVisible();
    await postCard.locator("button").filter({ hasText: "Commentaires" }).first().click();

    const commentInput = page.getByPlaceholder("Ajouter un commentaire");
    await expect(commentInput).toBeVisible();
    await commentInput.fill(commentBody);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(commentBody)).toBeVisible();

    await page.reload();

    postCard = page.locator("article").filter({ has: page.getByRole("button", { name: post.title }) }).first();
    await expect(postCard).toBeVisible();
    await postCard.locator("button").filter({ hasText: "Commentaires" }).first().click();
    await expect(page.getByText(commentBody)).toBeVisible();
  });
});
