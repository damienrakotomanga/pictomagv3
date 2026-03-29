import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PICTOMAG_BASE_URL ?? "http://127.0.0.1:3005";
const parsedBaseUrl = new URL(baseURL);
const devPort = Number.parseInt(parsedBaseUrl.port || "3005", 10);
const devHost = parsedBaseUrl.hostname || "127.0.0.1";
const serverMode = process.env.PICTOMAG_E2E_SERVER_MODE ?? (process.env.CI ? "start" : "dev");
const webServerCommand =
  serverMode === "start"
    ? `npm run build && npx next start --hostname ${devHost} --port ${devPort}`
    : `npx next dev --hostname ${devHost} --port ${devPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: serverMode === "dev" && !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseURL,
      PICTOMAG_BASE_URL: baseURL,
      PICTOMAG_LIVE_WS_PORT: process.env.PICTOMAG_LIVE_WS_PORT ?? "3011",
      PICTOMAG_LIVE_WS_SECRET: process.env.PICTOMAG_LIVE_WS_SECRET ?? "change-me",
      PICTOMAG_LIVE_WS_TTL_SECONDS: process.env.PICTOMAG_LIVE_WS_TTL_SECONDS ?? "90",
      PICTOMAG_ALLOW_QUERY_USER_ID: process.env.PICTOMAG_ALLOW_QUERY_USER_ID ?? "1",
      PICTOMAG_LIVE_REDIS_URL: process.env.PICTOMAG_LIVE_REDIS_URL ?? "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
