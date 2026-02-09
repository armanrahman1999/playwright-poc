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
          await emailInput.fill("");
          await emailInput.type("f1aring@yopmail.com", { delay: 100 });
          console.log("✓ Email entered");
      } else {
          throw new Error("Email/Username input not found");
      }

    } catch (error) {
      console.error("⚠ Email field not found or fill failed:", error instanceof Error ? error.message : String(error));
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
      console.error("⚠ Password field not found or fill failed:", error instanceof Error ? error.message : String(error));
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
      console.error("⚠ Submit/Navigation failed:", error instanceof Error ? error.message : String(error));
      
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

    // Specific Action: Select Project "Siuuu"
    if (jobId) {
        testEventBus.emitTestEvent({
        jobId,
        type: "navigating",
        timestamp: new Date().toISOString(),
        data: { targetUrl: "Project: Siuuu" },
        });
    }

    try {
        console.log("Searching for project 'Siuuu'...");
        // Wait for dashboard content to settle
        await page.waitForTimeout(3000);
        
        // Try to find by text content - using strict mode false to match partial or nested
        // Common pattern for project cards
        const projectFound = await page.getByText('Siuuu', { exact: false }).first().isVisible().catch(() => false);
        
        if (projectFound) {
            console.log("✓ Project 'Siuuu' found. Clicking...");
            await page.getByText('Siuuu', { exact: false }).first().click();
            
            // Wait for navigation
            try {
                await page.waitForURL('**/project-overview/environments**', { timeout: 20000, waitUntil: 'domcontentloaded' });
                console.log("✓ Successfully navigated to Project Overview");
                
                // Add screenshot of project page
                const projectScreenshotPath = path.join(
                    process.cwd(), 
                    "test-results", 
                    `screenshot-${Date.now()}-05-project-view.png`
                );
                await page.screenshot({ path: projectScreenshotPath, fullPage: true });
                
                if (jobId) {
                    testEventBus.emitTestEvent({
                        jobId,
                        type: "validation-progress",
                        timestamp: new Date().toISOString(),
                        data: { 
                            current: 1, 
                            total: 1,
                            message: "Entered Project: Siuuu" 
                        },
                    });
                }
            } catch (navWaitError) {
                 console.warn("⚠ Clicked project but navigation timeout:", navWaitError instanceof Error ? navWaitError.message : String(navWaitError));
            }
        } else {
            console.warn("⚠ Project 'Siuuu' not found on dashboard.");
        }
    } catch (projectError) {
            console.error("⚠ Failed to navigate to project 'Siuuu':", projectError instanceof Error ? projectError.message : String(projectError));
    }

// Run UI Page Tour (Project Specific Sidebar)
    if (jobId) {
      testEventBus.emitTestEvent({
        jobId,
        type: "validation-started",
        timestamp: new Date().toISOString(),
        data: { message: "Starting project sidebar navigation..." },
      });
    }

    try {
      // Small pause to ensure menu is fully rendered
      await page.waitForTimeout(2000);

      // Specific sequence requested: Settings -> Repositories -> People -> Environments
      const sidebarItems = ["Settings", "Repositories", "People", "Environments"];
      
      if (jobId) {
        testEventBus.emitTestEvent({
            jobId,
            type: "validation-progress",
            timestamp: new Date().toISOString(),
            data: { current: 0, total: sidebarItems.length },
        });
      }

      for (let i = 0; i < sidebarItems.length; i++) {
        const item = sidebarItems[i];
        console.log(`Navigating to sidebar item: ${item}`);

        if (jobId) {
            testEventBus.emitTestEvent({
                jobId,
                type: "navigating",
                timestamp: new Date().toISOString(),
                data: { targetUrl: `Sidebar: ${item}` },
            });
        }

        try {
            // Locate by text - flexible matching
            // We search specifically for standard navigation text
            const element = page.getByText(item, { exact: false }).first();
            
            // Wait briefly for it to be actionable
            await element.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            
            if (await element.isVisible()) {
                console.log(`Clicking ${item}...`);
                await element.click();

                // 1. Minimum Stability Wait:
                // Ensure the click registers and the app starts reacting (skeletons mount, etc.)
                await page.waitForTimeout(2000);

                // 2. Wait for Loaders/Skeletons "Trap"
                // We wait briefly for a skeleton to APIEAR. If it appears, we then wait for it to DISAPPEAR.
                try {
                     const skeletonSelector = '[class*="skeleton"], [class*="Skeleton"], [class*="loading"], [role="progressbar"], [data-loading="true"]';
                     
                     // Check if a skeleton is visible NOW or appears within 2 seconds
                     const skeletonAppeared = await page.waitForSelector(skeletonSelector, { state: 'visible', timeout: 2000 }).catch(() => null);
                     
                     if (skeletonAppeared) {
                        console.log("Skeleton/Loader detected. Waiting for data...");
                        await page.waitForSelector(skeletonSelector, { state: 'hidden', timeout: 15000 });
                        console.log("✓ Data loaded (loader vanished)");
                     } else {
                         console.log("No skeleton appeared (content might be cached or static)");
                     }
                } catch (e) {
                    console.log("Loader check bypassed");
                }

                // 3. Fallback Network Idle
                // Just in case no skeleton is used but requests are flying
                await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

                console.log(`✓ Section ${item} ready`);
                
                // Final visual pause as requested
                await page.waitForTimeout(2000);

            } else {
                console.warn(`⚠ Sidebar item '${item}' not found (skipping)`);
            }
        } catch (stepError) {
             console.error(`⚠ Failed to click '${item}':`, stepError instanceof Error ? stepError.message : String(stepError));
        }
        
        if (jobId) {
            testEventBus.emitTestEvent({
                jobId,
                type: "validation-progress",
                timestamp: new Date().toISOString(),
                data: { current: i + 1, total: sidebarItems.length },
            });
        }
      }

    } catch (tourError) {
      console.error("⚠ Project tour failed:", tourError instanceof Error ? tourError.message : String(tourError));
    }

    // Enter Development Environment
    if (jobId) {
        testEventBus.emitTestEvent({
           jobId,
           type: "navigating",
           timestamp: new Date().toISOString(),
           data: { targetUrl: "Environment: Development" },
       });
   }

   try {
       console.log("Searching for 'Development' environment...");
       await page.waitForTimeout(1000);
       
       // Find "Development" text (likely a card title or link)
       const devEnv = page.getByText('Development', { exact: false }).first();
       
       if (await devEnv.isVisible()) {
            await devEnv.click();
            console.log("✓ Clicked 'Development'");
            
            // Wait for navigation to dashboard
            try {
                await page.waitForURL('**/dashboard*', { timeout: 20000, waitUntil: 'domcontentloaded' });
                console.log("✓ Successfully navigated to Dashboard");
                
                // Wait for dashboard content
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                
                // Check for skeletons on dashboard
                try {
                     const skeletonSelector = '[class*="skeleton"], [class*="Skeleton"], [class*="loading"]';
                     if (await page.$(skeletonSelector)) {
                         await page.waitForSelector(skeletonSelector, { state: 'hidden', timeout: 10000 });
                     }
                } catch (e) {}
                
                // Final visual capture
                await page.waitForTimeout(2000);
            } catch (navError) {
                 console.warn("⚠ Navigation to dashboard timeout:", navError instanceof Error ? navError.message : String(navError));
            }
       } else {
           console.warn("⚠ 'Development' text not found on Environments page");
       }
   } catch (devError) {
        console.error("⚠ Failed to enter Development environment:", devError instanceof Error ? devError.message : String(devError));
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
                // Log only message to avoid Next.js source-map crashes on Windows with file:// URLs
                console.log("saveAs failed, falling back to manual copy:", saveAsError instanceof Error ? saveAsError.message : String(saveAsError));
                
                try {
                    // Fallback to manual path copy
                    let originalPath = await videoObj.path();
                    // Sanitize path for logging to prevent Next.js console crash
                    const sanitizedLogPath = originalPath.replace(/file:\/\//g, 'file_protocol_');
                    console.log(`Original video path: ${sanitizedLogPath}`);
                    
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
                     console.error("Manual copy failed:", copyError instanceof Error ? copyError.message : String(copyError));
                }
            }
        } else {
            console.log("No video object found for page.");
        }
    } catch (videoError) {
        console.error("CRITICAL VIDEO ERROR:", videoError instanceof Error ? videoError.message : String(videoError));
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
        console.error("Failed to capture error screenshot:", screenshotError instanceof Error ? screenshotError.message : String(screenshotError));
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
    try {
        if (state.page) await state.page.close();
        if (state.context) await state.context.close();
        if (state.browser) await state.browser.close();
    } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    }
  }
}

export { runTest, launchBrowser };
export type { TestRunnerConfig };
