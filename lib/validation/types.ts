/**
 * UI Validation Tests
 * 
 * Defines automated UI validation checks for cloud.seliseblocks.com
 * Tests for: layout, colors, elements presence, responsiveness, accessibility
 */

export type ValidationTestType =
  | "element-visibility"
  | "element-count"
  | "color-check"
  | "text-content"
  | "image-visibility"
  | "form-inputs"
  | "button-clickable"
  | "responsive-layout"
  | "accessibility";

export interface ValidationTest {
  id: string;
  name: string;
  type: ValidationTestType;
  selector?: string;
  description: string;
  expectedValue?: any;
  critical: boolean; // If true, test failure fails entire suite
}

export interface ValidationResult {
  testId: string;
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  actual?: any;
  expected?: any;
  screenshot?: string;
}

export interface UIValidationReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  duration: number;
  results: ValidationResult[];
  overallPassed: boolean;
  timestamp: string;
}

/**
 * Default validation tests for cloud.seliseblocks.com/login
 */
export const DEFAULT_VALIDATION_TESTS: ValidationTest[] = [
  // Layout & Structure Tests
  {
    id: "test-logo-visible",
    name: "Logo is visible",
    type: "element-visibility",
    selector: "img[alt*='logo'], img[alt*='Blocks'], .logo",
    description: "Verify the Blocks logo is displayed on login page",
    critical: true,
  },
  {
    id: "test-login-form-visible",
    name: "Login form is visible",
    type: "element-visibility",
    selector: "form, [role='form'], .login-form",
    description: "Verify login form container is rendered",
    critical: true,
  },
  {
    id: "test-email-input-visible",
    name: "Email input field is visible",
    type: "element-visibility",
    selector: "input[type='email'], input[placeholder*='email' i], input[name*='email' i]",
    description: "Verify email input field exists",
    critical: true,
  },
  {
    id: "test-password-input-visible",
    name: "Password input field is visible",
    type: "element-visibility",
    selector: "input[type='password'], input[placeholder*='password' i], input[name*='password' i]",
    description: "Verify password input field exists",
    critical: true,
  },
  {
    id: "test-login-button-visible",
    name: "Login button is visible",
    type: "element-visibility",
    selector: "button:has-text('Login'), button:has-text('Sign In'), button[type='submit']",
    description: "Verify login/submit button is rendered",
    critical: true,
  },

  // Text Content Tests
  {
    id: "test-page-title",
    name: "Page has correct title",
    type: "text-content",
    selector: "h1, title",
    description: "Verify page title is present",
    critical: false,
  },

  // Form Input Tests
  {
    id: "test-email-input-type",
    name: "Email input has correct type",
    type: "form-inputs",
    selector: "input[type='email']",
    expectedValue: "email",
    description: "Verify email field is type email",
    critical: true,
  },
  {
    id: "test-password-input-type",
    name: "Password input has correct type",
    type: "form-inputs",
    selector: "input[type='password']",
    expectedValue: "password",
    description: "Verify password field is type password",
    critical: true,
  },

  // Button Tests
  {
    id: "test-login-button-enabled",
    name: "Login button is not disabled",
    type: "button-clickable",
    selector: "button[type='submit'], button:has-text('Login'), button:has-text('Sign In')",
    description: "Verify login button is enabled and clickable",
    critical: true,
  },

  // Responsive Layout
  {
    id: "test-responsive-mobile",
    name: "Layout is responsive on mobile",
    type: "responsive-layout",
    description: "Verify layout adapts to mobile viewport (320px)",
    critical: false,
  },

  // Accessibility
  {
    id: "test-form-labels",
    name: "Form fields have associated labels",
    type: "accessibility",
    description: "Verify form inputs are properly labeled for accessibility",
    critical: false,
  },
  {
    id: "test-color-contrast",
    name: "Text has sufficient color contrast",
    type: "color-check",
    description: "Verify text meets WCAG contrast requirements",
    critical: false,
  },
];
