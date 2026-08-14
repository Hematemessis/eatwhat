import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
function findLocalChromium(): string | undefined {
  if (process.platform !== "win32") return undefined;
  const cacheRoot = path.join(os.homedir(), "AppData/Local/ms-playwright");
  if (!fs.existsSync(cacheRoot)) return undefined;

  const installs = fs.readdirSync(cacheRoot)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));

  for (const install of installs) {
    for (const relativePath of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"]) {
      const candidate = path.join(cacheRoot, install, relativePath);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const localChromium = findLocalChromium();
const executablePath = process.env.QA_CHROMIUM_PATH
  ?? localChromium;

export default defineConfig({
  testDir: __dirname,
  testMatch: /demo-flow\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: "pnpm --filter @groupplan/web dev --hostname 127.0.0.1",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
