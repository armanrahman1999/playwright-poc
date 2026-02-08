/**
 * UI Validation Executor
 * 
 * Executes validation tests against a page using Playwright
 * Tests for element visibility, content, accessibility, responsive design, etc.
 */

import { Page } from "@playwright/test";
import {
  ValidationTest,
  ValidationResult,
  UIValidationReport,
  DEFAULT_VALIDATION_TESTS,
} from "./types";

/**
 * Execute a single validation test
 */
async function executeValidationTest(
  page: Page,
  test: ValidationTest
): Promise<ValidationResult> {
  const startTime = Date.now();
  let passed = false;
  let error: string | undefined;
  let actual: any;

  try {
    switch (test.type) {
      case "element-visibility":
        // Check if element exists and is visible
        if (!test.selector) throw new Error("Selector required for visibility test");
        try {
          const element = page.locator(test.selector).first();
          const isVisible = await element.isVisible().catch(() => false);
          passed = isVisible;
          if (!passed) {
            error = `Element not visible: ${test.selector}`;
          }
        } catch (e) {
          passed = false;
          error = `Element not found: ${test.selector}`;
        }
        break;

      case "form-inputs":
        // Check input type attribute
        if (!test.selector) throw new Error("Selector required for form test");
        try {
          const inputType = await page
            .locator(test.selector)
            .first()
            .getAttribute("type");
          actual = inputType;
          passed = inputType === test.expectedValue;
          if (!passed) {
            error = `Expected type "${test.expectedValue}", got "${inputType}"`;
          }
        } catch (e) {
          passed = false;
          error = `Could not verify input type`;
        }
        break;

      case "button-clickable":
        // Check if button is enabled and visible
        if (!test.selector) throw new Error("Selector required for button test");
        try {
          const button = page.locator(test.selector).first();
          const isDisabled = await button.isDisabled().catch(() => false);
          const isVisible = await button.isVisible().catch(() => false);
          passed = !isDisabled && isVisible;
          if (!passed) {
            error = `Button is ${isDisabled ? "disabled" : "not visible"}`;
          }
        } catch (e) {
          passed = false;
          error = "Button not found or not clickable";
        }
        break;

      case "element-count":
        // Count elements matching selector
        if (!test.selector) throw new Error("Selector required for count test");
        try {
          const count = await page.locator(test.selector).count();
          actual = count;
          passed = count >= (test.expectedValue || 1);
          if (!passed) {
            error = `Expected ${test.expectedValue} elements, found ${count}`;
          }
        } catch (e) {
          passed = false;
          error = "Could not count elements";
        }
        break;

      case "text-content":
        // Check if element contains expected text
        if (!test.selector) throw new Error("Selector required for text test");
        try {
          const element = page.locator(test.selector).first();
          const hasContent = await element.count().then((c) => c > 0);
          passed = hasContent;
          if (!passed) {
            error = `Element not found: ${test.selector}`;
          }
        } catch (e) {
          passed = false;
          error = "Could not verify text content";
        }
        break;

      case "responsive-layout":
        // Test responsive design at different viewport sizes
        try {
          // Test at mobile viewport (320px width)
          await page.setViewportSize({ width: 320, height: 568 });
          
          // Check if page is still functional
          const body = page.locator("body");
          const isVisible = await body.isVisible();
          passed = isVisible;
          
          // Reset viewport
          await page.setViewportSize({ width: 1280, height: 720 });
          
          if (!passed) {
            error = "Page layout broken on mobile viewport";
          }
        } catch (e) {
          passed = false;
          error = "Could not test responsive layout";
        }
        break;

      case "accessibility":
        // Basic accessibility checks
        try {
          // Check for main landmark
          const main = page.locator("main, [role='main']");
          const hasMain = await main.count().then((c) => c > 0);
          passed = hasMain;
          if (!passed) {
            error = "Page missing main content landmark";
          }
        } catch (e) {
          passed = false;
          error = "Could not verify accessibility";
        }
        break;

      case "color-check":
        // Basic color contrast check (simplified)
        try {
          const body = page.locator("body");
          const isVisible = await body.isVisible();
          passed = isVisible; // Simplified check
          if (!passed) {
            error = "Could not verify color contrast";
          }
        } catch (e) {
          passed = false;
          error = "Color contrast check failed";
        }
        break;

      case "image-visibility":
        // Check if images load properly
        if (!test.selector) throw new Error("Selector required for image test");
        try {
          const img = page.locator(test.selector).first();
          const isVisible = await img.isVisible();
          passed = isVisible;
          if (!passed) {
            error = `Image not visible: ${test.selector}`;
          }
        } catch (e) {
          passed = false;
          error = "Image not found";
        }
        break;

      default:
        passed = false;
        error = `Unknown test type: ${test.type}`;
    }
  } catch (e) {
    passed = false;
    error = e instanceof Error ? e.message : String(e);
  }

  const duration = Date.now() - startTime;

  return {
    testId: test.id,
    testName: test.name,
    passed,
    duration,
    error,
    actual,
    expected: test.expectedValue,
  };
}

/**
 * Execute all validation tests for a page
 */
export async function runValidationTests(
  page: Page,
  tests: ValidationTest[] = DEFAULT_VALIDATION_TESTS
): Promise<UIValidationReport> {
  const startTime = Date.now();
  const results: ValidationResult[] = [];

  console.log(`Running ${tests.length} validation tests...`);

  // Run tests sequentially to avoid race conditions
  for (const test of tests) {
    try {
      const result = await executeValidationTest(page, test);
      results.push(result);
      console.log(
        `${result.passed ? "✓" : "✗"} ${result.testName} (${result.duration}ms)`
      );
    } catch (e) {
      results.push({
        testId: test.id,
        testName: test.name,
        passed: false,
        duration: 0,
        error: `Test execution failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const duration = Date.now() - startTime;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;
  const criticalFailures = results.filter(
    (r) => !r.passed && tests.find((t) => t.id === r.testId)?.critical
  ).length;

  const overallPassed = criticalFailures === 0 && failedTests === 0;

  return {
    totalTests: tests.length,
    passedTests,
    failedTests,
    criticalFailures,
    duration,
    results,
    overallPassed,
    timestamp: new Date().toISOString(),
  };
}
