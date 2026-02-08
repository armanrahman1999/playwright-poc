# Quick Start Guide

## What This App Does

✅ **Automatically test the Blocks Cloud login page UI**
- Launches a headless browser
- Navigates to your target URL
- Validates all UI elements are present and functional
- Shows you the live page rendering as it happens
- Displays test results in real-time

---

## Getting Started

### 1. Start the Server
```bash
npm run dev
```
Server will start on: **http://localhost:3000**

### 2. Open the Dashboard
Visit: `http://localhost:3000`

### 3. Start a Test
1. Enter a URL (default: `https://cloud.seliseblocks.com/login`)
2. Click **"Start Test"**
3. Watch the **"Live Test Execution (Split View)"** panel

---

## What You'll See

### Left Panel: Live UI Preview
- Real-time screenshot of the page being tested
- Updates as page loads
- Shows exactly what Playwright sees

### Right Panel: Validation Results
- Real-time test results appearing as they run
- Shows:
  - ✓ Total tests
  - ✓ Tests passed/failed
  - ✓ Critical failures
  - ✓ Individual test details

### Status Bar
- Current action being performed
- "LIVE" indicator while test is running
- Real-time console errors

---

## Test Execution Timeline

```
1. Browser launches
   ↓
2. Page starts loading
   ↓
3. Screenshot captured
   ↓
4. Validation tests run (checks elements, forms, accessibility)
   ↓
5. Results displayed in real-time
   ↓
6. Test completes
```

---

## Validation Tests (What Gets Checked)

The app automatically validates:

| Check | Purpose |
|-------|---------|
| **Logo visible** | Blocks logo displays |
| **Login form visible** | Form container exists |
| **Email field** | Email input renders and has correct type |
| **Password field** | Password input renders and has correct type |
| **Login button** | Submit button is visible and clickable |
| **Form labels** | Fields properly labeled for accessibility |
| **Mobile layout** | Page works on mobile viewport (320px) |
| **Text contrast** | Text is readable (WCAG standards) |

**Total**: 12 tests (8 critical, 4 non-critical)

---

## Understanding Results

### Green = Pass ✓
Test succeeded - element found, button clickable, etc.

### Red = Fail ✗
Test failed - element missing, selector not found, button disabled, etc.

### Critical Failure
If any **critical** test fails, entire test fails.

---

## Viewing Test History

1. **Test History** panel on left shows all previous tests
2. Click any test to see detailed results
3. Results include:
   - Status (passed/failed)
   - Execution time
   - Any console errors
   - Validation test summary
   - Screenshots (clickable to view full size)

---

## Adding Custom Tests

Want to check something specific? Add a custom validation test:

1. Edit: `lib/validation/types.ts`
2. Add test to `DEFAULT_VALIDATION_TESTS` array
3. Restart dev server
4. Next test will include your custom check

Example:
```typescript
{
  id: "test-forgot-password",
  name: "Forgot password link visible",
  type: "element-visibility",
  selector: "a[href*='forgot'], button:has-text('Forgot')",
  critical: false,
}
```

See [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) for detailed examples.

---

## Troubleshooting

### Test Hangs
- Check if page is loading properly
- Verify URL is correct and accessible
- Check browser console for errors

### "Validation tests failed" Error
- Some validation checks couldn't run
- Check page structure matches selectors
- View screenshot to see actual page state

### Selector Not Finding Element
- Verify CSS selector is correct
- Check element exists in target page
- Try using text matching: `button:has-text('Login')`

### Port 3000 Already in Use
Use a different port:
```bash
PORT=3001 npm run dev
```

---

## File Locations

```
Important Files:
├── components/SplitViewDashboard.tsx  ← Main live view component
├── lib/validation/types.ts            ← Validation test definitions
├── lib/validation/executor.ts         ← Validation test logic
└── lib/playwright/runner.ts           ← Browser automation
```

---

## Key Features

🎬 **Live Rendering** - Watch the page as it's being tested
✓ **Automated Validation** - 12 built-in validation tests
📊 **Real-time Results** - See test results as they happen
📸 **Screenshots** - Full page screenshots for review
📝 **Detailed Logs** - Console errors and warnings captured
🎯 **Accessibility Checks** - WCAG compliance validation
📱 **Responsive Testing** - Mobile viewport validation

---

## Example Test Scenarios

### Scenario 1: Verify Login Page Loads
1. Start test with default URL
2. View split-view dashboard
3. Confirm all form elements visible
4. Check validation results show all pass

### Scenario 2: Test After Design Changes
1. Make UI changes to page
2. Run test
3. Compare new results to previous test
4. Validation tests will highlight any broken elements

### Scenario 3: Add Custom Validation
1. Add new test for specific element
2. Run test
3. New test appears in results
4. Automatically included in all future tests

---

## Tips & Tricks

✨ **Pro Tips:**
- Check **Console Errors** panel to spot JavaScript errors
- **Download screenshots** for side-by-side comparison
- **Expand test results** to see expected vs actual values
- **Click test result rows** to see full error details
- **Use browser DevTools** to test selectors before adding to validation suite

---

## Architecture (Simple Overview)

```
┌─────────────────────┐
│   Browser (You)     │
│  http://localhost   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────┐
│   Next.js App (Frontend)    │
│  - Dashboard                │
│  - Live Preview             │
│  - Results Display          │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│   API Endpoints                  │
│  /api/run-test       (Start)     │
│  /api/job-status     (Status)    │
│  /api/test-stream    (Live SSE)  │
│  /api/screenshot     (Get image) │
└──────────┬─────────────────────────┘
           │
           ↓
┌──────────────────────────────┐
│   Background Test Executor   │
│  - Launches Playwright       │
│  - Navigates to URL          │
│  - Runs validation tests     │
│  - Returns results           │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│   Target Website             │
│  cloud.seliseblocks.com/login│
└──────────────────────────────┘
```

---

## Technologies Used

- **Playwright** - Browser automation
- **Next.js** - Web framework
- **React** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Server-Sent Events** - Real-time streaming

---

## Next Steps

1. ✅ Start the dev server
2. ✅ Run your first test
3. ✅ Review results in split-view
4. ✅ Add custom validation tests
5. ✅ Monitor test history

---

**Questions?** Check the detailed guides:
- [VALIDATION_GUIDE.md](VALIDATION_GUIDE.md) - Custom validation tests
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Full technical details
- [API.md](API.md) - API endpoint reference

**Server Status**: Check terminal for any errors
**Build Status**: `npm run build` to verify no errors

Happy testing! 🚀
