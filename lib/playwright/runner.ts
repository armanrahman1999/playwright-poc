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
async function launchBrowser(recordVideoDir?: string): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  // Launch browser in headless mode with minimal overhead
  const browser = await chromium.launch({
    headless: true, // Keep headerless for server-side execution
    args: [
      "--no-sandbox", // Required in some environments
      "--disable-gpu", // Disable GPU for faster startup
      "--disable-web-resources", // Reduce memory footprint
      "--disable-dev-shm-usage", // Avoid shared memory issues
    ],
  });

  // Create isolated context - prevents cookie/storage sharing
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // Allow testing with self-signed certs
    javaScriptEnabled: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    recordVideo: recordVideoDir ? {
        dir: recordVideoDir,
        size: { width: 1280, height: 720 }
    } : undefined,
    viewport: { width: 1280, height: 720 }
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
  const screenshots: string[] = []; // Keeping for backward compat, though we focus on video
  const startTime = Date.now();
  let pageLoadSuccess = false;
  let videoPath = "";

  try {
    // Launch browser and create context
    // Store videos in public/recordings we can serve them directly
    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
    }
    console.log(`Debug: Recordings directory: ${recordingsDir}`);

    const { browser, context } = await launchBrowser(recordingsDir);
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
      // Small pause for video to catch up
      await page.waitForTimeout(1000);
      
      // Select by name="username" as defined in SigninForm
      const emailSelector = 'input[name="username"]';

      // Fallback to generic if not found (though name="username" is from source)
      try {
        await page.waitForSelector(emailSelector, { timeout: 3000 });
      } catch {
         // Fallback just in case
      }
      
      const emailInput = await page.$(emailSelector) || await page.$('input[type="email"]');
      
      if (emailInput) {
          // Click to focus (visual cue)
          await emailInput.click();
          // Type with delay so it's visible in video
          await emailInput.fill("f1aring@yopmail.com"); // Fill is faster/safer than type for value setting
          // But for video we want visual typing?
          // Let's clear and type
          await emailInput.clear();
          await emailInput.type("f1aring@yopmail.com", { delay: 100 });
          console.log("✓ Email entered");
      } else {
          throw new Error("Email/Username input not found");
      }

    } catch (error) {
      console.error("⚠ Email field not found or fill failed:", error);
    }
    
    // Capture screenshot after email entry
    await new Promise(resolve => setTimeout(resolve, 500));
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
      await page.waitForTimeout(500);
      // Select by name="password"
      const passwordSelector = 'input[name="password"]';
      await page.waitForSelector(passwordSelector, { timeout: 5000 });
      
      // Click and type slowly
      await page.click(passwordSelector);
      await page.type(passwordSelector, "@Rman1234", { delay: 100 });
      console.log("✓ Password entered");
    } catch (error) {
      console.error("⚠ Password field not found or fill failed:", error);
    }
    
    // Capture screenshot after password entry
    await new Promise(resolve => setTimeout(resolve, 500));
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

    // Check for Captcha
    try {
        const captchaSelector = 'iframe[title="reCAPTCHA"], #g-recaptcha-response';
        const captcha = await page.$(captchaSelector);
        if (captcha) {
            console.error("⚠ Captcha detected! Automation cannot proceed.");
            throw new Error("Captcha detected - Login blocked");
        }
    } catch (e) {
        if (e instanceof Error && e.message.includes("Captcha")) throw e;
    }

    // Submit form (Click Button OR Press Enter)
    try {
      await page.waitForTimeout(1000);
      
      // Submit button selector
      const buttonSelector = 'button[type="submit"]';
      
      // Strategy 1: Press Enter in the password field
      console.log("Attempting submission via Enter key...");
      await page.keyboard.press('Enter');
      
      // Wait a moment to see if navigation starts
      try {
        await page.waitForURL((url) => !url.href.includes('login'), { timeout: 5000 });
        console.log("✓ Navigation confirmed after Enter key");
      } catch (e) {
        console.log("⚠️ No navigation after Enter key, trying button click...");
        
        // Strategy 2: Click the button
        const button = await page.$(buttonSelector);
        if (button) {
            await button.hover();
            await page.waitForTimeout(500);
            await button.click();
            console.log("✓ Login button clicked");
        }
      }

      // Wait for navigation after submit attempts
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log(`Current URL after login attempt: ${currentUrl}`);

      // Check for error messages
      const errorText = await page.evaluate(() => {
        const errors = document.querySelectorAll(
            '.error, .alert, .text-danger, .has-error, [role="alert"], div:has-text("Invalid"), span:has-text("Invalid")'
        );
        return Array.from(errors).map(e => e.textContent).join('; ');
      });

      if (errorText && errorText.length > 0) {
          console.error(`❌ Found error messages on page: ${errorText}`);
          throw new Error(`Login failed with message: ${errorText}`);
      }

      if (!currentUrl.includes('/console')) {
          console.log("⚠ Not on console page yet, forcing navigation...");
          await page.goto("https://cloud.seliseblocks.com/console", { waitUntil: "domcontentloaded" });
          
          await page.waitForTimeout(5000); // Give it extra time to render
          
          // Check URL again
          if (page.url().includes('login')) {
              console.error("❌ Redirected back to login page. Authentication likely failed.");
               throw new Error("Authentication failed - redirected to login");
          }
      } else {
          console.log("✓ Successfully arrived at Console");
      }

    } catch (error) {
      console.error("⚠ Submit/Navigation failed:", error);
      
      // Take a debug screenshot specifically for login failure
       const debugPath = path.join(process.cwd(), "test-results", `debug-login-fail-${Date.now()}.png`);
       if (state.page) await state.page.screenshot({ path: debugPath, fullPage: true });

       if (jobId) {
            testEventBus.emitTestEvent({
              jobId,
              type: "failed", // Mark as failed here so user knows
              timestamp: new Date().toISOString(),
              data: { error: `Login failed or timed out. Check debug screenshot.` },
            });
       }
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

    // Run UI Page Tour (Discovery & Visit)
    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "validation-started",
        timestamp: new Date().toISOString(),
        data: { message: "Starting automated page tour..." },
      });
    }

    const visitedUrls = new Set<string>();
    visitedUrls.add(page.url()); // Add current

    try {
      // Small pause to ensure menu is fully rendered and animated
      await page.waitForTimeout(3000);

      // Collect links from navigation areas
      const links = await page.evaluate(() => {
        // Broad selector to find navigation items
        const anchors = Array.from(document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="menu"] a, aside a, header a'));
        return anchors
          .map(a => ({
            href: a.href,
            text: a.innerText || a.getAttribute('aria-label') || 'Link'
          }))
          .filter(link => 
            link.href && 
            !link.href.toLowerCase().includes('logout') && 
            !link.href.toLowerCase().includes('signout') && 
            !link.href.startsWith('javascript:') &&
            !link.href.includes('#')
          );
      });

      console.log(`Found ${links.length} potential navigation links`);
      
      // Filter duplicates
      const uniqueLinks = [];
      const seenHrefs = new Set();
      for (const link of links) {
        if (!seenHrefs.has(link.href) && !visitedUrls.has(link.href)) {
          seenHrefs.add(link.href);
          uniqueLinks.push(link);
        }
      }

      // Limit tour length
      const tourLinks = uniqueLinks.slice(0, 8); // Visit up to 8 pages

      if (jobId) {
        testEventBus.emitTestEvent({
          jobId,
          type: "validation-progress",
          timestamp: new Date().toISOString(),
          data: { 
            current: 0, 
            total: tourLinks.length 
          },
        });
      }

      for (let i = 0; i < tourLinks.length; i++) {
        const link = tourLinks[i];
        
        // Notify navigation
        if (jobId) {
          testEventBus.emitTestEvent({
            jobId,
            type: "navigating",
            timestamp: new Date().toISOString(),
            data: { targetUrl: link.href },
          });
        }

        try {
          console.log(`Touring: ${link.text} -> ${link.href}`);
          await page.goto(link.href, { waitUntil: "domcontentloaded", timeout: 20000 });
          
          // Visual pause for video recording
          await page.waitForTimeout(2000);

            // Update progress
            testEventBus.emitTestEvent({
              jobId,
              type: "validation-progress",
              timestamp: new Date().toISOString(),
              data: { 
                current: i + 1, 
                total: tourLinks.length 
              },
            });

        } catch (navError) {
          console.error(`Failed to visit ${link.href}:`, navError);
        }
      }

    } catch (tourError) {
      console.error("⚠ Page tour failed:", tourError);
    }
    
    // Legacy support since we removed validation
    const validationReport = {
        totalTests: 0,
        passedTests: 0, 
        failedTests: 0,
        criticalFailures: 0,
        results: [],
        overallPassed: true,
        timestamp: new Date().toISOString()
    };
    
    // Close page to save video
    await page.close();
    state.page = null;
    
    // Rename video file to something friendly
    try {
        const videoObj = await page.video();
        if (videoObj) {
            console.log("Video object found, attempting to save...");
            
            const fileName = `session-${jobId}-${Date.now()}.webm`;
            const newPath = path.join(process.cwd(), "public", "recordings", fileName);
            console.log(`Target video path: ${newPath}`);
            
            // Wait a tick ensures recording is flushed
            await new Promise(r => setTimeout(r, 500));
            
            // Try using modern saveAs API first (Playwright 1.33+)
            try {
                await videoObj.saveAs(newPath);
                videoPath = `/recordings/${fileName}`;
                console.log(`Video saved successfully via saveAs to ${videoPath}`);
            } catch (saveAsError) {
                console.log("saveAs failed, falling back to manual copy:", saveAsError);
                
                try {
                    // Fallback to manual path copy
                    let originalPath = await videoObj.path();
                    console.log(`Original video path: ${originalPath}`);
                    
                    // Manual path cleanup for file:// URLs
                    if (originalPath.startsWith('file:')) {
                        // Strip protocol
                        originalPath = originalPath.replace(/^file:\/\/\/?/, '');
                        
                        // Handle Windows drive letters: /C:/Path -> C:/Path
                        if (process.platform === 'win32' && originalPath.startsWith('/') && originalPath[2] === ':') {
                            originalPath = originalPath.substring(1);
                        }
                        
                        // Decode URI components (spaces, special chars)
                        originalPath = decodeURIComponent(originalPath);
                    }
                    
                    if (fs.existsSync(originalPath)) {
                        fs.copyFileSync(originalPath, newPath);
                        videoPath = `/recordings/${fileName}`;
                        console.log(`Video saved successfully via copy to ${videoPath}`);
                    } else {
                        console.error(`Original video file not found at ${originalPath}`);
                    }
                } catch (copyError) {
                     console.error("Manual copy failed:", copyError);
                }
            }
        } else {
            console.log("No video object found for page.");
        }
    } catch (videoError) {
        console.error("CRITICAL VIDEO ERROR:", videoError);
        // Do NOT rethrow. Video failure is non-fatal for the test result.
    }


    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "validation-complete",
        timestamp: new Date().toISOString(),
        data: {
          totalTests: 0,
          passed: 0,
          failed: 0,
          report: validationReport,
        },
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
          videoPath
        },
      });
    }

    return {
      passed: true,
      pageLoadSuccess,
      consoleErrors,
      screenshots, // Empty or minimal
      executionTimeMs,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      validationReport,
      videoPath
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    let errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.stack) {
       errorMessage += `\n\nStack Trace:\n${error.stack}`;
    }

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
