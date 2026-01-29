/**
 * Playwright Test Runner Utilities
 * 
 * Provides functions to:
 * - Launch isolated browser contexts
 * - Run tests against remote URLs
 * - Capture test results (screenshots, console errors, etc.)
 * - Handle timeouts safely
 * 
 * All Playwright operations happen server-side ONLY.
 * Never execute this code in the browser or Edge runtime.
 */

import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { TestResult } from "../jobs/types";

interface TestRunnerConfig {
  headless?: boolean;
  timeout?: number;
  screenshotOnFailure?: boolean;
  captureConsole?: boolean;
}

interface TestRunnerState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
}

/**
 * Launches a headless Chromium browser instance
 * Uses isolated context to prevent state leakage between tests
 */
async function launchBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  // Launch browser in headless mode with minimal overhead
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox", // Required in some environments
      "--disable-gpu", // Disable GPU for faster startup
      "--disable-web-resources", // Reduce memory footprint
    ],
  });

  // Create isolated context - prevents cookie/storage sharing
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // Allow testing with self-signed certs
    javaScriptEnabled: true,
  });

  return { browser, context };
}

/**
 * Runs test suite against a remote URL
 * Collects: page load success, console errors, screenshots on failure, execution time
 */
async function runTest(
  targetUrl: string,
  config: TestRunnerConfig = {}
): Promise<TestResult> {
  const {
    headless = true,
    timeout = 30000,
    screenshotOnFailure = true,
    captureConsole = true,
  } = config;

  const state: TestRunnerState = {
    browser: null,
    context: null,
    page: null,
  };

  const consoleErrors: Array<{ level: string; message: string }> = [];
  const screenshots: string[] = [];
  const startTime = Date.now();
  let pageLoadSuccess = false;

  try {
    // Launch browser and create context
    const { browser, context } = await launchBrowser();
    state.browser = browser;
    state.context = context;

    // Create new page
    const page = await context.newPage();
    state.page = page;

    // Set timeout for page operations
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // Capture console messages (both logs and errors)
    if (captureConsole) {
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          consoleErrors.push({
            level: msg.type(),
            message: msg.text(),
          });
        }
      });

      // Also capture uncaught exceptions
      page.on("pageerror", (error) => {
        consoleErrors.push({
          level: "error",
          message: `Uncaught: ${error.message}`,
        });
      });
    }

    // Navigate to URL
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout: timeout,
    });

    // Check if page loaded successfully (2xx or 3xx status)
    pageLoadSuccess = response ? response.ok() : false;

    // Wait for any dynamic content to load
    await page.waitForLoadState("networkidle");

    // Take screenshot on success
    const screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}.png`
    );

    // Ensure directory exists
    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    const executionTimeMs = Date.now() - startTime;

    return {
      passed: pageLoadSuccess && consoleErrors.length === 0,
      pageLoadSuccess,
      consoleErrors,
      screenshots,
      executionTimeMs,
      url: targetUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Attempt to capture screenshot on error if enabled
    if (screenshotOnFailure && state.page) {
      try {
        const errorScreenshotPath = path.join(
          process.cwd(),
          "test-results",
          `error-screenshot-${Date.now()}.png`
        );

        const screenshotDir = path.dirname(errorScreenshotPath);
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }

        await state.page.screenshot({ path: errorScreenshotPath, fullPage: true });
        screenshots.push(errorScreenshotPath);
      } catch (screenshotError) {
        console.error("Failed to capture error screenshot:", screenshotError);
      }
    }

    return {
      passed: false,
      pageLoadSuccess: false,
      consoleErrors: [{ level: "error", message: errorMessage }],
      screenshots,
      executionTimeMs,
      error: errorMessage,
      url: targetUrl,
      timestamp: new Date().toISOString(),
    };
  } finally {
    // Always clean up resources
    if (state.page) {
      await state.page.close().catch((e) => console.error("Error closing page:", e));
    }
    if (state.context) {
      await state.context.close().catch((e) => console.error("Error closing context:", e));
    }
    if (state.browser) {
      await state.browser.close().catch((e) => console.error("Error closing browser:", e));
    }
  }
}

export { runTest, launchBrowser };
export type { TestRunnerConfig };
