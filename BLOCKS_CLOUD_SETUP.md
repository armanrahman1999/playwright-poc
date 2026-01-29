# Blocks Cloud Login Page Testing

This application is now configured to test the login page at **https://cloud.seliseblocks.com/login**

## 🚀 Quick Start

### Option 1: Use the Dashboard (Recommended)

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Open dashboard**
   ```
   http://localhost:3000
   ```

3. **URL is pre-filled with:**
   ```
   https://cloud.seliseblocks.com/login
   ```

4. **Click "Start Test"** and watch the results

### Option 2: Run Tests Directly

```bash
# Run all login page tests
npx playwright test tests/example.spec.ts

# Run specific test
npx playwright test tests/example.spec.ts -g "should load the login page"

# Run in headed mode (see browser)
npx playwright test tests/example.spec.ts --headed

# View test results
npx playwright show-report
```

---

## 📋 Test Coverage

The test suite includes 10 tests for the login page:

### 1. **Page Load Test**
   - ✓ Verifies "Blocks Cloud" title visible
   - ✓ Checks "Log in" description present
   - ✓ Validates email input field
   - ✓ Validates password input field
   - ✓ Checks login button visible
   - ✓ Validates forgot password link
   - ✓ Validates sign up link

### 2. **Form Validation Tests**
   - ✓ Empty form submission shows validation errors
   - ✓ Invalid email format validation
   - ✓ Valid email format acceptance

### 3. **Navigation Tests**
   - ✓ Forgot password link navigation
   - ✓ Sign up link navigation

### 4. **UI Element Tests**
   - ✓ OR divider between password and social login

### 5. **Responsive Design Tests**
   - ✓ Mobile layout (375x812)
   - ✓ Tablet layout (768x1024)

---

## 🔧 Configuration

### Target URL
**File:** `playwright.config.ts`

```typescript
const TARGET_URL = "https://cloud.seliseblocks.com";

use: {
  baseURL: TARGET_URL,
  trace: "on-first-retry",
  screenshot: "only-on-failure",
  ignoreHTTPSErrors: true, // Allows any SSL certificate
},
```

### Test Timeout
- **Per test:** 30 seconds
- **Individual assertion:** 5 seconds
- **Browser operation:** 15 seconds

Adjust in `playwright.config.ts` if needed:
```typescript
const TEST_TIMEOUT = 30000; // milliseconds
```

---

## 📊 Using the Dashboard

### Submit Test Via Dashboard

1. **Dashboard loads with pre-filled URL**
   ```
   https://cloud.seliseblocks.com/login
   ```

2. **You can modify the URL** to test:
   - `/login` - Login page
   - `/forgot-password` - Forgot password page
   - `/signup` - Sign up page
   - Any other Blocks Cloud page

3. **Click "Start Test"**
   - Returns job ID immediately (202 Accepted)
   - Test runs in background
   - Dashboard polls every 1 second

4. **Results Include**
   - Execution time
   - Page load success/failure
   - Console errors and warnings
   - Screenshots
   - Full test results

### Example: Test Different Pages

```
# Test login page
https://cloud.seliseblocks.com/login

# Test forgot password page
https://cloud.seliseblocks.com/forgot-password

# Test signup page
https://cloud.seliseblocks.com/signup

# Test home page
https://cloud.seliseblocks.com
```

---

## 🔍 Running Tests

### Via Dashboard (Simplest)
1. Visit http://localhost:3000
2. Click "Start Test"
3. Watch results update in real-time

### Via Command Line (Full Control)
```bash
# Run all tests
npx playwright test

# Run login page tests only
npx playwright test tests/example.spec.ts

# Run specific test
npx playwright test -g "should validate email format"

# Run with headed browser (see it run)
npx playwright test --headed

# Run with trace on failure
npx playwright test --trace on

# Run in debug mode
npx playwright test --debug
```

### Via API (Programmatic)
```bash
# Start test
curl -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://cloud.seliseblocks.com/login"}'

# Check results
curl "http://localhost:3000/api/job-status?jobId=<jobId>"
```

---

## 📸 Test Results

### Results Stored In
```
test-results/
├── screenshot-1706388014423.png
├── screenshot-1706388015067.png
└── ...
```

### What's Captured
- ✓ Full page screenshots (PNG)
- ✓ Execution time (milliseconds)
- ✓ Console errors and warnings
- ✓ Page load success/failure
- ✓ Test status (pass/fail)
- ✓ Validation error messages

### View Results
1. **In Dashboard** - Click job to see details
2. **In Folder** - Open `test-results/` directory
3. **In Report** - Run `npx playwright show-report`

---

## ⚙️ Customizing Tests

### Add New Test

Edit `tests/example.spec.ts`:

```typescript
test("should log in with valid credentials", async ({ page }) => {
  // Navigate to login
  await page.goto("/login", { waitUntil: "networkidle" });

  // Fill form
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");

  // Submit
  await page.getByRole("button", { name: "Log in" }).click();

  // Wait for dashboard or next page
  await page.waitForURL(/.*dashboard/, { timeout: 5000 });
});
```

### Modify Selectors

Find elements by:
- **Role:** `page.getByRole("button", { name: "Log in" })`
- **Label:** `page.getByLabel("Email")`
- **Text:** `page.getByText("Blocks Cloud")`
- **Placeholder:** `page.getByPlaceholder("Enter email")`
- **CSS:** `page.locator(".login-form")`
- **XPath:** `page.locator("xpath=//button[@type='submit']")`

---

## 🐛 Troubleshooting

### Tests Won't Run

**Problem:** "Cannot reach https://cloud.seliseblocks.com"

**Solution:**
- Check internet connection
- Verify URL is correct
- Check firewall settings
- Try from command line first: `curl https://cloud.seliseblocks.com/login`

### Tests Pass But Screenshot Missing

**Problem:** Screenshots not appearing

**Solution:**
- Check `test-results/` directory exists
- Verify disk space available
- Check file permissions

### Timeout Errors

**Problem:** "Timeout waiting for navigation"

**Solution:**
- Increase timeout in `playwright.config.ts`
- Add explicit waits for specific elements
- Check network speed/stability

### SSL Certificate Error

**Problem:** "SSL certificate error"

**Solution:**
- Already handled in config: `ignoreHTTPSErrors: true`
- If still failing, check certificate validity

---

## 🚀 Production Deployment

### Deploy Dashboard to Vercel

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Configure Environment**
   - Set any required env variables
   - Verify URL configuration

### Deploy Test Runner to CI/CD

1. **GitHub Actions Example**
   ```yaml
   name: Run Blocks Cloud Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm install
         - run: npx playwright install
         - run: npx playwright test
   ```

2. **GitHub Pages Report**
   ```bash
   npx playwright test
   npx playwright show-report
   ```

---

## 📊 Monitoring

### Check Test Results

**Via Dashboard:**
- Visit http://localhost:3000
- View test history
- Click any test for details

**Via Command Line:**
```bash
# View test report
npx playwright show-report

# Export results as JSON
npx playwright test --reporter=json > results.json
```

**Via API:**
```bash
# Get all jobs
curl http://localhost:3000/api/run-test

# Get specific job
curl "http://localhost:3000/api/job-status?jobId=<jobId>"
```

---

## 🔐 Security Notes

### Credentials
- **Never hardcode credentials** in tests
- Use environment variables:
  ```typescript
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  ```

### Test Account
- Create dedicated test account on Blocks Cloud
- Use non-production data
- Rotate credentials regularly

### Data Privacy
- Screenshots may contain sensitive data
- Store results securely
- Clean up old test results

---

## 📞 Support

### Tests Working?
✅ Visit http://localhost:3000
✅ Submit URL
✅ Watch results update in real-time

### Need Help?
- Check terminal logs for errors
- Review test failures in screenshots
- Verify URL is correct and accessible
- Check network connectivity

---

## 📚 Documentation

Related files:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [API.md](API.md) - API reference
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Complete overview

---

## ✅ Verification Checklist

Before running tests:

- [ ] Server started (`npm run dev`)
- [ ] Dashboard loads (http://localhost:3000)
- [ ] URL field shows "https://cloud.seliseblocks.com/login"
- [ ] Internet connection working
- [ ] Blocks Cloud login page is accessible
- [ ] No VPN/firewall blocking access
- [ ] Playwright installed (`npx playwright install chromium`)

---

**Ready to test the Blocks Cloud login page! 🚀**
