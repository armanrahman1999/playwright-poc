/**
 * Playwright Configuration
 * 
 * Defines browser launch options and default test settings.
 * Located outside app router to avoid bundling into client code.
 */

import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Use environment variable for parallel workers (default: 1 for consistent results)
const WORKERS = process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 1;

// Timeout for each test (30 seconds)
const TEST_TIMEOUT = 30000;

// Timeout for browser launch and operations (15 seconds)
const BROWSER_TIMEOUT = 15000;

// Target URL for Blocks Cloud
const TARGET_URL = "https://cloud.seliseblocks.com";

export default defineConfig({
  testDir: path.join(process.cwd(), "tests"),
  outputDir: path.join(process.cwd(), "test-results"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: WORKERS,
  timeout: TEST_TIMEOUT,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: TARGET_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true, // Allow testing with any SSL certificate
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: undefined, // Don't start a test server - we'll target remote URLs
});
