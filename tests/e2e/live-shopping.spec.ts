import { expect, test } from "@playwright/test";

test.describe("live shopping realtime flow", () => {
  test("exposes a realtime descriptor with Redis bridge enabled", async ({ request }) => {
    const response = await request.get("/api/live-shopping/realtime?eventId=1");
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.transport).toBe("websocket");
    expect(payload.bridge?.redisConfigured).toBeTruthy();
    expect(payload.bridge?.redisEnabled).toBeTruthy();
  });

  test("opens the bid modal, confirms a bid, and posts a chat message", async ({ page }) => {
    const chatMessage = `playwright-live-${Date.now()}`;

    await page.setViewportSize({ width: 1600, height: 1400 });
    await page.goto("/live-shopping/tenten-one-piece-fr-boxbreak");

    const primaryAction = page.getByTestId("live-selected-lot-primary-action");
    await expect(primaryAction).toBeVisible();

    await primaryAction.click();

    const bidModal = page.getByTestId("live-bid-modal");
    await expect(bidModal).toBeVisible();

    const firstBidChoice = bidModal.locator('[data-testid^="live-bid-choice-"]').first();
    await expect(firstBidChoice).toBeVisible();
    await firstBidChoice.click();

    const confirmBidButton = bidModal.getByTestId("live-bid-confirm");
    await expect(confirmBidButton).toBeVisible();
    await confirmBidButton.click();
    await expect(page.getByTestId("live-toast")).toBeVisible();
    await expect(bidModal).toHaveCount(0);

    const chatInput = page.getByTestId("live-chat-input");
    await expect(chatInput).toBeVisible();
    await chatInput.fill(chatMessage);
    await page.getByTestId("live-chat-submit").click();

    await expect(page.getByTestId("live-chat-list")).toContainText(chatMessage);
  });

  test("opens custom bid, wallet, and fixed checkout flows", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await page.goto("/live-shopping/tenten-one-piece-fr-boxbreak");

    await page.getByTestId("live-selected-lot-custom-action").click();
    const customBidModal = page.getByTestId("live-bid-modal-custom");
    await expect(customBidModal).toBeVisible();
    await customBidModal.getByTestId("live-bid-input-custom").fill("42");
    await customBidModal.getByTestId("live-bid-confirm-custom").click();
    await expect(page.getByTestId("live-toast")).toBeVisible();
    await expect(customBidModal).toHaveCount(0);

    await page.getByTestId("live-wallet-open").click();
    const walletModal = page.getByTestId("live-wallet-modal");
    await expect(walletModal).toBeVisible();
    await walletModal.getByTestId("live-wallet-payment-panel-toggle").click();
    await walletModal.getByTestId("live-wallet-payment-wallet").click();
    await expect(walletModal).toContainText("Wallet Pictomag");
    await page.keyboard.press("Escape");
    await expect(walletModal).toHaveCount(0);

    await page.getByTestId("live-lot-action-japan-pack").click();
    const checkoutModal = page.getByTestId("live-checkout-modal");
    await expect(checkoutModal).toBeVisible();
    await checkoutModal.getByTestId("live-checkout-payment-wallet").click();
    await checkoutModal.getByTestId("live-checkout-note").fill("playwright checkout note");
    await checkoutModal.getByTestId("live-checkout-confirm").click();
    await expect(page.getByTestId("live-toast")).toBeVisible();
    await expect(checkoutModal).toHaveCount(0);
  });
});
