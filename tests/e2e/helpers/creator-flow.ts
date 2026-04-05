import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type CreatorIdentity = {
  email: string;
  password: string;
  displayName: string;
  username: string;
};

export function createCreatorIdentity(prefix = "playwright-phase2"): CreatorIdentity {
  const nonce = `${Date.now()}${Math.trunc(Math.random() * 100_000)}`;
  const sanitizedPrefix = prefix.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10);
  const usernameTail = nonce.slice(-10);

  return {
    email: `${prefix}-${nonce}@pictomag.test`,
    password: `${prefix}-password`,
    displayName: `Phase 2 ${nonce.slice(-4)}`,
    username: `${sanitizedPrefix}${usernameTail}`.slice(0, 24),
  };
}

export async function completeCreatorSignup(
  page: Page,
  identity: CreatorIdentity,
  bio = "Profil de test configure depuis la phase 2.",
) {
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
  await page.getByPlaceholder("Creatif, stories, visuels, videos, editions, projets.").fill(bio);
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/profile$/, { timeout: 15000 });
}

export async function createPostViaApi(
  api: APIRequestContext,
  payload: Record<string, unknown>,
) {
  const response = await api.post("/api/posts", {
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    post?: {
      id: number;
      title: string;
      albumName?: string | null;
    };
  };
  expect(body.post).toBeTruthy();

  return body.post!;
}
