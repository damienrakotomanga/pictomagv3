import { expect, test } from "@playwright/test";
import { completeCreatorSignup, createCreatorIdentity, createPostViaApi } from "./helpers/creator-flow";

test.describe("Feed video mode", () => {
  test("renders a real reel with persisted interactions and real destinations", async ({ page }) => {
    const identity = createCreatorIdentity("playwright-feed-video");
    await completeCreatorSignup(page, identity);

    const post = await createPostViaApi(page.request, {
      surface: "reel",
      kind: "video",
      title: `Reel phase 2 ${Date.now()}`,
      body: "Flux video reel relie a un vrai post.",
      durationLabel: "0:12",
      trackName: "Phase 2 reel soundtrack",
      media: [
        {
          mediaType: "video",
          src: "/live-shopping/categories/trading-card-games.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-3.jpg",
          altText: "Reel phase 2",
          position: 0,
        },
      ],
    });
    const commentBody = `Commentaire reel ${Date.now()}`;

    await page.goto("/?mode=video");

    let reelCard = page.locator("section.post-cluster").filter({ hasText: post.title }).first();
    await expect(reelCard).toBeVisible();

    const timeLikeButton = reelCard.locator(".feed-action-item-save");
    await expect(timeLikeButton).toContainText("0");
    await page.waitForTimeout(8200);
    await expect(timeLikeButton).toContainText("1");

    const commentsButton = reelCard.locator(".feed-action-item-comments");
    await commentsButton.click();

    const commentInput = page.getByPlaceholder("Ajouter un commentaire");
    await expect(commentInput).toBeVisible();
    await commentInput.fill(commentBody);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(commentBody)).toBeVisible();
    await page.getByRole("button", { name: "Close comments" }).last().click();

    await expect(commentsButton).toContainText("1");

    await reelCard.getByRole("button", { name: "Voir le post" }).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${post.id}$`));

    await page.goto("/?mode=video");
    reelCard = page.locator("section.post-cluster").filter({ hasText: post.title }).first();
    await expect(reelCard).toBeVisible();
    await reelCard.getByRole("button").filter({ hasText: `@${identity.username}` }).first().click();
    await expect(page).toHaveURL(new RegExp(`/u/${identity.username}$`));
  });
});
