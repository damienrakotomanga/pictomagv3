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

    const bidResponsePromise = page.waitForResponse((response) => response.url().includes("/api/live-shopping/actions"));
    const confirmBidButton = bidModal.getByTestId("live-bid-confirm");
    await expect(confirmBidButton).toBeVisible();
    await confirmBidButton.click();
    const toast = page.getByTestId("live-toast");
    await expect(toast).toBeVisible();
    const toastText = await toast.textContent();
    const bidResponse = await bidResponsePromise;
    const bidPayload = await bidResponse.json();
    expect(bidResponse.ok(), `Bid request failed with toast: ${toastText ?? ""} payload: ${JSON.stringify(bidPayload)}`).toBeTruthy();
    await expect(toast).toContainText(/Offre enregistree|Enchere deja prise en compte/i);
    await expect(bidModal).toBeHidden();

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
    const customBidConfirmButton = customBidModal.getByTestId("live-bid-confirm-custom");
    const customBidConfirmLabel = (await customBidConfirmButton.textContent()) ?? "";
    const minimumBidMatch = customBidConfirmLabel.match(/(\d[\d\s\u00A0]*)\s*€/);
    const minimumBid = minimumBidMatch
      ? Number.parseInt(minimumBidMatch[1].replace(/[^\d]/g, ""), 10)
      : NaN;
    expect(Number.isFinite(minimumBid)).toBeTruthy();
    await customBidModal.getByTestId("live-bid-input-custom").fill(String(minimumBid));
    await expect(customBidConfirmButton).toBeEnabled();
    const customBidResponsePromise = page.waitForResponse((response) => response.url().includes("/api/live-shopping/actions"));
    await customBidConfirmButton.click();
    const customBidToast = page.getByTestId("live-toast");
    await expect(customBidToast).toBeVisible();
    const customBidToastText = await customBidToast.textContent();
    const customBidResponse = await customBidResponsePromise;
    const customBidPayload = await customBidResponse.json();
    expect(
      customBidResponse.ok(),
      `Custom bid request failed with toast: ${customBidToastText ?? ""} payload: ${JSON.stringify(customBidPayload)}`,
    ).toBeTruthy();
    await expect(customBidToast).toContainText(/Offre enregistree|Enchere deja prise en compte/i);
    await expect(customBidModal).toBeHidden();

    await page.getByTestId("live-wallet-open").click();
    const walletModal = page.getByTestId("live-wallet-modal");
    await expect(walletModal).toBeVisible();
    await walletModal.getByTestId("live-wallet-payment-panel-toggle").click();
    await walletModal.getByTestId("live-wallet-payment-wallet").click();
    await expect(walletModal).toContainText("Wallet Pictomag");
    await page.keyboard.press("Escape");
    await expect(walletModal).toBeHidden();

    await page.getByTestId("live-lot-action-japan-pack").click();
    const checkoutModal = page.getByTestId("live-checkout-modal");
    await expect(checkoutModal).toBeVisible();
    await checkoutModal.getByTestId("live-checkout-payment-wallet").click();
    await checkoutModal.getByTestId("live-checkout-note").fill("playwright checkout note");
    const checkoutResponsePromise = page.waitForResponse((response) => response.url().includes("/api/live-shopping/actions"));
    await checkoutModal.getByTestId("live-checkout-confirm").click();
    const checkoutToast = page.getByTestId("live-toast");
    await expect(checkoutToast).toBeVisible();
    const checkoutToastText = await checkoutToast.textContent();
    const checkoutResponse = await checkoutResponsePromise;
    const checkoutPayload = await checkoutResponse.json();
    expect(
      checkoutResponse.ok(),
      `Checkout request failed with toast: ${checkoutToastText ?? ""} payload: ${JSON.stringify(checkoutPayload)}`,
    ).toBeTruthy();
    await expect(checkoutToast).toContainText(/Paiement simule valide|Commande deja confirmee/i);
    await expect(checkoutModal).toBeHidden();
  });
});
