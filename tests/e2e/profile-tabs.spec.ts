import { expect, test } from "@playwright/test";
import { completeCreatorSignup, createCreatorIdentity, createPostViaApi } from "./helpers/creator-flow";

test.describe("Profile media tabs", () => {
  test("opens real videos and albums from profile tabs", async ({ page }) => {
    const identity = createCreatorIdentity("playwright-profile-tabs");
    await completeCreatorSignup(page, identity);

    const videoPost = await createPostViaApi(page.request, {
      surface: "classic",
      kind: "video",
      title: `Video phase 2 ${Date.now()}`,
      body: "Video de test pour la vue profil.",
      durationLabel: "0:12",
      trackName: "Phase 2 soundtrack",
      media: [
        {
          mediaType: "video",
          src: "/live-shopping/categories/trading-card-games.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-3.jpg",
          altText: "Video phase 2",
          position: 0,
        },
      ],
    });

    const albumName = `Album phase 2 ${Date.now()}`;
    const albumPost = await createPostViaApi(page.request, {
      surface: "classic",
      kind: "gallery",
      title: `Galerie phase 2 ${Date.now()}`,
      body: "Album de test pour la vue profil.",
      albumName,
      media: [
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-1.jpg",
          altText: "Album image 1",
          position: 0,
        },
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-2.jpg",
          altText: "Album image 2",
          position: 1,
        },
      ],
    });

    await page.goto("/profile");

    await page.getByRole("button", { name: "Videos" }).click();
    const videoTile = page.locator("button").filter({ hasText: videoPost.title }).first();
    await expect(videoTile).toBeVisible();
    await videoTile.click();
    await expect(page).toHaveURL(new RegExp(`/posts/${videoPost.id}$`));

    await page.goto("/profile");
    await page.getByRole("button", { name: "Albums" }).click();
    await expect(page.getByText(albumName)).toBeVisible();
    await page.getByRole("button", { name: "Voir le post" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/posts/${albumPost.id}$`));
  });
});
