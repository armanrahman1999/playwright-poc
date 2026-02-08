# UI Validation Tests - Customization Guide

## Overview
The UI validation system is highly extensible. You can add custom validation tests to check any aspect of your UI.

## Adding Custom Validation Tests

### Step 1: Define Your Test in `lib/validation/types.ts`

```typescript
// Add to DEFAULT_VALIDATION_TESTS array
{
  id: "test-unique-id",
  name: "Human readable test name",
  type: "element-visibility", // See types below
  selector: "css-selector-or-playwright-selector",
  description: "What this test validates",
  expectedValue: "value-if-applicable", // Optional
  critical: true, // Fail entire suite if this fails?
}
```

### Step 2: Implement Test Logic in `lib/validation/executor.ts`

Add case to the switch statement in `executeValidationTest()`:

```typescript
case "your-custom-type":
  // Your test logic here
  // Set: passed (boolean), error (string), actual (any)
  if (!test.selector) throw new Error("Selector required");
  try {
    // Perform checks
    const element = page.locator(test.selector);
    passed = await element.isVisible();
    if (!passed) error = "Element not visible";
  } catch (e) {
    passed = false;
    error = e instanceof Error ? e.message : String(e);
  }
  break;
```

---

## Validation Test Types

### 1. **element-visibility**
Checks if an element is visible on the page

```typescript
{
  id: "test-header-visible",
  name: "Page header is visible",
  type: "element-visibility",
  selector: "header, [role='banner']",
  critical: true,
}
```

### 2. **element-count**
Counts elements matching a selector

```typescript
{
  id: "test-menu-items",
  name: "Menu has items",
  type: "element-count",
  selector: ".menu-item",
  expectedValue: 3, // Expect at least 3 items
  critical: false,
}
```

### 3. **text-content**
Verifies element exists and has content

```typescript
{
  id: "test-login-label",
  name: "Email label exists",
  type: "text-content",
  selector: "label[for='email']",
  critical: true,
}
```

### 4. **form-inputs**
Validates input field types and attributes

```typescript
{
  id: "test-email-type",
  name: "Email field has type='email'",
  type: "form-inputs",
  selector: "input[type='email']",
  expectedValue: "email",
  critical: true,
}
```

### 5. **button-clickable**
Checks if button is enabled and visible

```typescript
{
  id: "test-submit-clickable",
  name: "Submit button is clickable",
  type: "button-clickable",
  selector: "button[type='submit']",
  critical: true,
}
```

### 6. **color-check**
Verifies color contrast and styling

```typescript
{
  id: "test-contrast",
  name: "Text has sufficient contrast",
  type: "color-check",
  description: "Verify WCAG AA contrast ratio",
  critical: false,
}
```

### 7. **image-visibility**
Checks if images load and display

```typescript
{
  id: "test-logo-img",
  name: "Logo image loads",
  type: "image-visibility",
  selector: "img[alt*='logo']",
  critical: true,
}
```

### 8. **responsive-layout**
Tests layout at different viewport sizes

```typescript
{
  id: "test-mobile-layout",
  name: "Layout responsive on mobile",
  type: "responsive-layout",
  description: "Tests at 320px viewport width",
  critical: false,
}
```

### 9. **accessibility**
Basic accessibility checks (landmarks, labels, etc.)

```typescript
{
  id: "test-main-landmark",
  name: "Page has main content area",
  type: "accessibility",
  description: "Verify <main> or [role='main'] exists",
  critical: false,
}
```

---

## Examples: Adding Tests for Blocks Cloud Login

### Example 1: Check for "Forgot Password" Link
```typescript
{
  id: "test-forgot-password-link",
  name: "Forgot password link visible",
  type: "element-visibility",
  selector: "a[href*='forgot'], button:has-text('Forgot')",
  description: "Verify password recovery option",
  critical: false,
}
```

### Example 2: Check Form Submit Button Text
```typescript
{
  id: "test-button-text",
  name: "Login button has correct text",
  type: "text-content",
  selector: "button[type='submit']",
  description: "Verify button says 'Login' or 'Sign In'",
  critical: true,
}
```

### Example 3: Check for Remember Me Checkbox
```typescript
{
  id: "test-remember-me",
  name: "Remember me checkbox exists",
  type: "element-visibility",
  selector: "input[type='checkbox'][name*='remember']",
  description: "Verify remember me option",
  critical: false,
}
```

### Example 4: Check Navigation Responsive at Tablet Size
```typescript
{
  id: "test-tablet-layout",
  name: "Layout works on tablet",
  type: "responsive-layout",
  description: "Verify layout adapts to 768px viewport",
  critical: false,
}
```

---

## Advanced: Custom Validation Logic

For more complex validations, extend the `executeValidationTest()` function:

```typescript
// In lib/validation/executor.ts
case "custom-feature":
  if (!test.selector) throw new Error("Selector required");
  try {
    const element = page.locator(test.selector).first();
    
    // Multiple checks
    const isVisible = await element.isVisible();
    const isEnabled = !(await element.isDisabled());
    const text = await element.textContent();
    
    passed = isVisible && isEnabled && text?.includes("expected");
    actual = { visible: isVisible, enabled: isEnabled, text };
    
    if (!passed) {
      error = `Expected visible, enabled button with text. Got: ${JSON.stringify(actual)}`;
    }
  } catch (e) {
    passed = false;
    error = e instanceof Error ? e.message : String(e);
  }
  break;
```

---

## Using Playwright Selectors

The `selector` field supports standard CSS selectors and Playwright's extended syntax:

```typescript
// CSS Selectors
"input[type='email']"
"button.primary"
"div > p:first-child"

// Playwright Text Matching
"button:has-text('Login')"
"text=Log In"

// Accessibility Selectors
"[role='button']"
"[aria-label='Close']"
"label:has-text('Email')"

// Attribute Matching
"input[name='username']"
"a[href^='https']"
"img[alt*='logo']"
```

---

## Testing Your Custom Validation

### 1. Add test to `lib/validation/types.ts`
### 2. Implement logic in `lib/validation/executor.ts`
### 3. Start a test and monitor results

The validation results will show:
- ✓ Pass/Fail status
- Execution time
- Error messages (if failed)
- Expected vs Actual values
- Expandable details for inspection

---

## Validation Results Structure

Each test execution produces:

```typescript
{
  testId: "test-id",
  testName: "Test name",
  passed: true,
  duration: 245, // milliseconds
  error: undefined, // Error message if failed
  actual: "actual-value-if-applicable",
  expected: "expected-value-if-applicable",
  screenshot: "path-if-captured"
}
```

The full report includes:
```typescript
{
  totalTests: 12,
  passedTests: 11,
  failedTests: 1,
  criticalFailures: 0,
  duration: 5234,
  results: [...], // Array of individual results
  overallPassed: true, // Only false if critical test fails
  timestamp: "2026-02-05T..."
}
```

---

## Best Practices

1. **Be Specific**: Use precise selectors that target the exact element
2. **Clear Descriptions**: Write clear test descriptions for debugging
3. **Critical vs Non-Critical**: Mark tests as critical only if test failure = page failure
4. **Meaningful IDs**: Use descriptive IDs for easy identification
5. **Test Isolation**: Each test should be independent
6. **Error Messages**: Provide clear error messages for failures
7. **Timeout Handling**: Selectors will timeout gracefully - catch errors

---

## Common Patterns

### Check for Required Form Fields
```typescript
{
  id: "test-required-fields",
  name: "All required fields have asterisk",
  type: "element-count",
  selector: "input[required], [aria-required='true']",
  critical: true,
}
```

### Verify Button States
```typescript
{
  id: "test-button-disabled-initially",
  name: "Submit button disabled until form filled",
  type: "button-clickable",
  selector: "button[type='submit']:not([disabled])",
  critical: false, // Might be enabled by default
}
```

### Check Accessibility Landmarks
```typescript
{
  id: "test-skip-to-content",
  name: "Skip to main content link present",
  type: "element-visibility",
  selector: "a[href='#main'], .skip-link",
  critical: false,
}
```

### Verify External Resource Loading
```typescript
{
  id: "test-cdn-fonts",
  name: "Font resources loaded",
  type: "element-visibility",
  selector: "link[href*='fonts']",
  critical: false,
}
```

---

## Debugging Failed Tests

1. **Check the selector** - Use browser DevTools to verify selector works
2. **Review screenshot** - Download screenshot from test results to see what rendered
3. **Check error message** - Validation results show exact error
4. **Inspect timing** - Some elements load dynamically - may need extra wait
5. **Test in browser** - Open target URL in browser to verify element exists

---

For questions or more examples, see the default tests in `lib/validation/types.ts`
