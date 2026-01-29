/**
 * Blocks Cloud Login Page Tests
 *
 * Tests for the login functionality at https://cloud.seliseblocks.com/login
 * These tests verify:
 * - Page loads with all elements visible
 * - Validation errors display correctly
 * - Email format validation works
 * - Form submission handling
 * - Navigation links work
 * - Responsive design (mobile, tablet, desktop)
 */

import { test, expect } from "@playwright/test";

test.describe("Login Page (Blocks Cloud)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto("/login", { waitUntil: "networkidle" });
  });

  test("should load the login page with all elements", async ({ page }) => {
    // Check title
    await expect(page.locator("text=Blocks Cloud")).toBeVisible();

    // Check description - use role selector to be specific
    await expect(page.getByRole("paragraph").filter({ hasText: "Log in" })).toBeVisible();

    // Check form elements
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // Check buttons and links
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("should display validation errors for empty form submission", async ({ page }) => {
    // Try to submit empty form
    await page.getByRole("button", { name: "Log in" }).click();

    // Wait for validation messages to appear
    await expect(page.locator("text=Invalid email format")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=Password is required")).toBeVisible({ timeout: 3000 });
  });

  test("should validate email format", async ({ page }) => {
    // Fill with invalid email
    await page.getByLabel("Email").fill("invalid-email");
    await page.getByRole("button", { name: "Log in" }).click();

    // Check for validation error - matches the schema error message
    await expect(page.locator("text=Invalid email format")).toBeVisible({ timeout: 3000 });
  });

  test("should accept valid email format", async ({ page }) => {
    // Fill with valid email
    await page.getByLabel("Email").fill("john.doe@example.com");
    await page.getByLabel("Password").fill("password123");

    // Submit button should be enabled
    const submitButton = page.getByRole("button", { name: "Log in" });
    await expect(submitButton).toBeEnabled();
  });

  test("should navigate to forgot password page", async ({ page }) => {
    await page.getByRole("link", { name: "Forgot password?" }).click();

    // Wait for navigation
    await page.waitForURL(/.*forgot.*password/, { timeout: 5000 });
  });

  test("should navigate to sign up page", async ({ page }) => {
    await page.getByRole("link", { name: "Sign up" }).click();

    // Wait for navigation
    await page.waitForURL(/.*signup/, { timeout: 5000 });
  });

  test("should have OR divider between password and social login", async ({ page }) => {
    // Use getByText with exact match to get the specific OR span
    await expect(page.getByText("OR", { exact: true }).locator("xpath=self::span")).toBeVisible();
  });

  test("should have proper page layout on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Elements should still be visible
    await expect(page.locator("text=Blocks Cloud")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("should have proper page layout on tablet", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Elements should still be visible
    await expect(page.locator("text=Blocks Cloud")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });
});
