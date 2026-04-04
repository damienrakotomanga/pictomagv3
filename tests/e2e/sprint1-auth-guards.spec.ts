import { expect, test } from "@playwright/test";

type Sprint1UserIdentity = {
  email: string;
  password: string;
  displayName: string;
  username: string;
};

function createIdentity(prefix: string): Sprint1UserIdentity {
  const nonce = `${Date.now()}${Math.trunc(Math.random() * 100_000)}`;

  return {
    email: `playwright-${prefix}-${nonce}@pictomag.test`,
    password: "playwright-sprint1-password",
    displayName: `Playwright ${prefix} ${nonce.slice(-4)}`,
    username: `${prefix}${nonce}`.slice(0, 24),
  };
}

async function registerUser(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  identity: Sprint1UserIdentity,
) {
  const response = await request.post("/api/auth/register", {
    data: {
      email: identity.email,
      password: identity.password,
      displayName: identity.displayName,
      username: identity.username,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function registerOnboardedUser(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  identity: Sprint1UserIdentity,
) {
  await registerUser(request, identity);

  const patchResponse = await request.patch("/api/profile/me", {
    data: {
      displayName: identity.displayName,
      username: identity.username,
      bio: "Utilisateur onboarde pour le test Sprint 1.",
      completeOnboarding: true,
    },
  });

  expect(patchResponse.ok()).toBeTruthy();

  const logoutResponse = await request.post("/api/auth/logout");
  expect(logoutResponse.ok()).toBeTruthy();
}

test.describe("Sprint 1 auth guards", () => {
  test("protects profile/compose and routes login by onboarding status", async ({ page, request }) => {
    const pendingUser = createIdentity("pending");
    const onboardedUser = createIdentity("onboarded");

    await registerUser(request, pendingUser);
    await request.post("/api/auth/logout");
    await registerOnboardedUser(request, onboardedUser);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);

    await page.goto("/compose");
    await expect(page).toHaveURL(/\/login\?next=%2Fcompose$/);

    await page.getByPlaceholder("toi@pictomag.com").fill(pendingUser.email);
    await page.getByPlaceholder("8 caracteres minimum").fill(pendingUser.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.goto("/compose");
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.evaluate(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    });

    await page.goto("/login");
    await page.getByPlaceholder("toi@pictomag.com").fill(onboardedUser.email);
    await page.getByPlaceholder("8 caracteres minimum").fill(onboardedUser.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await page.goto("/compose");
    await expect(page).toHaveURL(/\/compose$/);
  });
});
