/**
 * Playwright Test Runner Utilities
 * 
 * Provides functions to:
 * - Launch isolated browser contexts
 * - Run tests against remote URLs
 * - Capture test results (screenshots, console errors, etc.)
 * - Run UI validation tests
 * - Handle timeouts safely
 * 
 * All Playwright operations happen server-side ONLY.
 * Never execute this code in the browser or Edge runtime.
 */

import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { TestResult } from "../jobs/types";
import { testEventBus } from "../jobs/events";
import { runValidationTests } from "../validation/executor";

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
  config: TestRunnerConfig = {},
  jobId?: string
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

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "started",
        timestamp: new Date().toISOString(),
        data: { targetUrl },
      });
    }

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

          if (jobId) {
            testEventBus.emitTestEvent({
              jobId,
              type: "console-error",
              timestamp: new Date().toISOString(),
              data: { level: msg.type(), message: msg.text() },
            });
          }
        }
      });

      // Also capture uncaught exceptions
      page.on("pageerror", (error) => {
        consoleErrors.push({
          level: "error",
          message: `Uncaught: ${error.message}`,
        });

        if (jobId) {
          testEventBus.emitTestEvent({
            jobId,
            type: "console-error",
            timestamp: new Date().toISOString(),
            data: { level: "error", message: `Uncaught: ${error.message}` },
          });
        }
      });
    }

    // Navigate to URL
    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "navigating",
        timestamp: new Date().toISOString(),
        data: { targetUrl },
      });
    }

    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout: timeout,
    });

    // Check if page loaded successfully (2xx or 3xx status)
    pageLoadSuccess = response ? response.ok() : false;

    // Capture screenshot of login page
    let screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}-01-login-page.png`
    );
    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    // Wait for email input field
    try {
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      await page.fill('input[type="email"], input[name="email"]', "f1aring@yopmail.com");
      console.log("✓ Email entered");
    } catch (error) {
      console.error("⚠ Email field not found or fill failed:", error);
    }
    
    // Capture screenshot after email entry
    await new Promise(resolve => setTimeout(resolve, 300));
    screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}-02-email-entered.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    // Wait for password input field
    try {
      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 });
      await page.fill('input[type="password"], input[name="password"]', "@Rman1234");
      console.log("✓ Password entered");
    } catch (error) {
      console.error("⚠ Password field not found or fill failed:", error);
    }
    
    // Capture screenshot after password entry
    await new Promise(resolve => setTimeout(resolve, 300));
    screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}-03-password-entered.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    // Wait for login button and click
    try {
      await page.waitForSelector('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")', { timeout: 5000 });
      const loginButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      if (loginButton) {
        await loginButton.click();
        console.log("✓ Login button clicked");
      }

      // Wait for navigation after login
      try {
        await page.waitForLoadState("networkidle", { timeout: timeout });
      } catch (navError) {
        console.error("⚠ Navigation timeout after login:", navError);
        // Continue anyway
      }
    } catch (error) {
      console.error("⚠ Login button not found or click failed:", error);
    }
    
    // Capture screenshot after login
    await new Promise(resolve => setTimeout(resolve, 500));
    screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}-04-after-login.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    // Run UI validation tests
    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "validation-started",
        timestamp: new Date().toISOString(),
        data: { message: "Starting UI validation tests..." },
      });
    }

    let validationReport;
    try {
      validationReport = await runValidationTests(page);

      if (jobId) {
        testEventBus.emitTestEvent({
          jobId,
          type: "validation-complete",
          timestamp: new Date().toISOString(),
          data: {
            totalTests: validationReport.totalTests,
            passed: validationReport.passedTests,
            failed: validationReport.failedTests,
            report: validationReport,
          },
        });
      }
    } catch (validationError) {
      console.error("⚠ Validation tests failed:", validationError);
      // Continue even if validation fails - don't block test results
    }

    // Capture final screenshot
    screenshotPath = path.join(
      process.cwd(),
      "test-results",
      `screenshot-${Date.now()}-05-final.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "screenshot",
        timestamp: new Date().toISOString(),
        data: { screenshotPath, success: true },
      });
    }

    const executionTimeMs = Date.now() - startTime;

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "completed",
        timestamp: new Date().toISOString(),
        data: {
          passed: pageLoadSuccess && consoleErrors.length === 0,
          executionTimeMs,
          errorCount: consoleErrors.length,
        },
      });
    }

    return {
      passed: pageLoadSuccess && consoleErrors.length === 0 && (!validationReport || validationReport.overallPassed),
      pageLoadSuccess,
      consoleErrors,
      screenshots,
      executionTimeMs,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      validationReport,
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

    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "failed",
        timestamp: new Date().toISOString(),
        data: { error: errorMessage },
      });
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
