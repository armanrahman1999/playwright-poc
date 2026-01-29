# Getting Started Visual Guide

## 🚀 5-Step Quick Start

### Step 1: Install & Start
```bash
cd d:\playwright\ui-observer
npm install                    # Already done
npm run dev                    # Start server
```

Expected output:
```
▲ Next.js 16.1.6 (Turbopack)
- Local:   http://localhost:3000
✓ Ready in 7.1s
```

### Step 2: Open Dashboard
```
Open browser → http://localhost:3000
```

You'll see:
```
╔════════════════════════════════════════════════════════════════╗
║                     Test Observer Dashboard                   ║
║                                                                ║
║  ┌─────────────────┐        ┌──────────────────────────────┐ ║
║  │ Start New Test  │        │ Test History                 │ ║
║  │                 │        │                              │ ║
║  │ Target URL:     │        │ https://github.com    ✓      │ ║
║  │ [input field]   │        │ https://example.com   ⏳     │ ║
║  │                 │        │                              │ ║
║  │ [Start Test] ◄──┼─ POST /api/run-test                  │ ║
║  │                 │                                        │ ║
║  │ Quick Stats:    │        │ Polling every 1 second ◄──┐  │ ║
║  │ Total: 2        │        │                             │  │ ║
║  │ Passed: 1       │        └────────────────────────────┘  ║
║  │ Failed: 0       │                                        ║
║  │ Running: 1      │        GET /api/job-status?jobId=... │ ║
║  └─────────────────┘        (Every 1 second)               ║
╚════════════════════════════════════════════════════════════════╝
```

### Step 3: Submit URL
```
1. Type: https://github.com
2. Click: "Start Test"
3. See: Job appears in history as "pending"
```

### Step 4: Watch Progress
```
Status changes:
pending    → running    → completed
⏳         → ⚙️         → ✓

Time:    Errors:  Screenshots:
2847ms   0        1
```

### Step 5: View Results
```
Click job to see:
✓ Page loaded successfully
✓ No console errors
✓ Execution time: 2847ms
✓ Screenshot captured
```

---

## 📊 System Diagram

### User Interaction
```
User
  │
  ├→ [Open Browser] → http://localhost:3000
  │                        ↓
  │              TestDashboard (React)
  │                        ↓
  ├→ [Enter URL] → https://example.com
  │                        ↓
  └→ [Click Start] ─→ POST /api/run-test
                            ↓
                      {jobId: "abc123"}
                      Status: 202 Accepted
                            ↓
                    [Return to User]
                            ↓
                    Dashboard polls every 1s
                            ↓
                    GET /api/job-status?jobId=abc123
                            ↓
                    {status: "running", ...}
                            ↓
                    [Update UI]
                            ↓
                    {status: "completed", result: {...}}
                            ↓
                    [Show Results]
```

### Server Processing
```
POST /api/run-test
      ↓
1. Validate URL ✓
      ↓
2. Generate Job ID ✓
      ↓
3. Store Job (status: pending)
      ↓
4. Call executeJobInBackground()
      ↓
5. Return 202 Accepted
      ↓
[API Request Complete - Non-blocking]
      ↓
[Background Process Continues...]
      ↓
6. Update status: running
      ↓
7. Launch Playwright Browser
      ↓
8. Navigate to URL
      ↓
9. Capture Console Errors
      ↓
10. Take Screenshot
      ↓
11. Update status: completed
      ↓
12. Store Results in Job
      ↓
[All done - waiting for poll]
```

---

## 🎯 Key Concepts

### Non-Blocking Execution
```
Traditional (BLOCKING):
User Request
  ↓
Test Runs ← User waits for response (30s timeout)
  ↓
Results Return
  ↓
User gets response

UI Observer (NON-BLOCKING):
User Request
  ↓
Test Queued ← Immediate response (202 Accepted)
  ↓
User continues working
  ↓
Test Runs in Background ← No blocking
  ↓
User polls for results when ready
  ↓
Results available
```

### Job Lifecycle
```
pending     → Job created, waiting to run
running     → Playwright browser executing test
completed   → Test finished successfully
  ├→ passed: true/false (based on console errors)
  └→ result: {status, time, errors, screenshots}
failed      → Test failed with error
  └→ error: "Error message"
```

### Data Flow
```
Dashboard
   ↓
Submit URL
   ↓
API Route
   ↓
Job Queue (In-Memory Map)
   ↓
Background Executor
   ↓
Playwright Runner
   ↓
Chromium Browser
   ↓
Remote URL
   ↓
Results
   ↓
Job Queue (Updated)
   ↓
Dashboard Polls
   ↓
Display Results
```

---

## 🧪 Example Test Scenario

### Scenario: Test GitHub

```
Step 1: User enters "https://github.com"
        ↓
Step 2: Server creates Job {
          id: "4bbe4689-29e9-41f0-84ad-181962eaeef5",
          targetUrl: "https://github.com",
          status: "pending"
        }
        ↓
Step 3: API returns 202 Accepted
        ↓
Step 4: Playwright launches Chromium (headless)
        ↓
Step 5: Browser navigates to https://github.com
        ↓
Step 6: Waits for networkidle state
        ↓
Step 7: Captures console for errors (none found)
        ↓
Step 8: Takes screenshot (~1024x768 PNG)
        ↓
Step 9: Closes browser, cleans up resources
        ↓
Step 10: Updates Job {
          status: "completed",
          result: {
            passed: true,
            pageLoadSuccess: true,
            executionTimeMs: 2847,
            consoleErrors: [],
            screenshots: ["test-results/...png"],
            timestamp: "2024-01-28T..."
          }
        }
        ↓
Step 11: Dashboard polls and gets updated Job
         ↓
Step 12: UI shows:
         ✓ Complete (green)
         Execution Time: 2847ms
         Page Load: Success
         Console Errors: 0
         Screenshots: 1
         [View Screenshot button]
```

---

## 🔍 Testing Different Scenarios

### Scenario 1: Successful Page Load
```
URL: https://github.com
Expected:
- Status: completed (green)
- Pass: true
- Execution time: 2-5 seconds
- Console errors: 0
```

### Scenario 2: Page with Warnings
```
URL: https://example.com
Expected:
- Status: completed (green)
- Pass: true (warnings don't fail)
- Console errors: 1+ (warnings)
- Execution time: 1-3 seconds
```

### Scenario 3: Non-existent Page
```
URL: https://github.com/nonexistent-page-404-not-found-xyz
Expected:
- Status: completed (green)
- Pass: false (HTTP 404)
- Execution time: 1-2 seconds
- Screenshot captured anyway
```

### Scenario 4: Slow Page
```
URL: https://slow-loading-site.com
Expected:
- Status: completed (green)
- Pass: depends on errors
- Execution time: 5-30 seconds
- May timeout if > 30 seconds
```

### Scenario 5: Multiple Tests
```
Submit 3 URLs at once:
1. https://github.com
2. https://example.com
3. https://vercel.com

Expected:
- All 3 appear in history
- Each polls independently
- Results appear as they complete
- No blocking between tests
```

---

## 💻 API Testing Examples

### Test 1: Basic cURL Request
```bash
# Start test
curl -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}'

# Response:
# {
#   "jobId": "abc-123-def",
#   "status": "pending"
# }

# Copy jobId and poll
curl "http://localhost:3000/api/job-status?jobId=abc-123-def"
```

### Test 2: View All Jobs
```bash
curl http://localhost:3000/api/run-test

# Shows all jobs submitted
# {
#   "totalJobs": 3,
#   "jobs": [...]
# }
```

### Test 3: Polling Loop (Bash)
```bash
#!/bin/bash
JOB_ID="abc-123-def"

for i in {1..30}; do
  echo "Poll $i..."
  curl "http://localhost:3000/api/job-status?jobId=$JOB_ID" | jq '.status'
  sleep 1
done
```

---

## 📁 Files You'll See

After running tests, check:

```
test-results/
├── screenshot-1706388014423.png  ← Success screenshot
├── screenshot-1706388015067.png  ← Another test
└── error-screenshot-1706388016234.png  ← Error screenshot
```

Each file is a full-page PNG screenshot of the tested URL.

---

## 🔧 Troubleshooting Checklist

### Port 3000 in use?
```bash
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

### Playwright not found?
```bash
npx playwright install chromium
```

### TypeScript errors?
```bash
npm run build  # Shows errors
npm run lint   # Check linting
```

### Tests not running?
1. Check server logs for errors
2. Verify URL is publicly accessible
3. Try different URL (e.g., https://example.com)
4. Check network connectivity

### Memory growing?
```bash
# In browser console
await fetch('/api/cleanup')  # If implemented

# Or restart server
npm run dev
```

---

## 📈 Performance Expectations

### Typical Timings

```
Page Load              1-5 seconds
Screenshot Capture    0.5-1 second
Total Execution       2-6 seconds
API Response          < 100ms (returns immediately)
Dashboard Poll        11ms-20ms per request
```

### Browser Memory
```
Chromium instance:     ~150-200 MB
Per test run:          Briefly spikes, then cleaned up
Typical memory usage:  300-500 MB total
```

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Server starts without errors
2. ✅ Dashboard loads at localhost:3000
3. ✅ Can submit a URL
4. ✅ Job status changes from pending → running
5. ✅ Job status changes to completed (after 2-5 seconds)
6. ✅ Results show execution time, status, screenshots
7. ✅ Can submit multiple URLs simultaneously
8. ✅ API endpoints return 200/202 responses
9. ✅ Screenshots are created in test-results/
10. ✅ No errors in browser console or server logs

---

## 🎓 Learning Path

### Beginner (Understand Usage)
1. Read: QUICKSTART.md
2. Try: Submit 3 different URLs
3. Check: Screenshots in test-results/

### Intermediate (Understand Architecture)
1. Read: ARCHITECTURE.md
2. Review: API routes (app/api/)
3. Trace: Request flow from UI to browser

### Advanced (Understand Implementation)
1. Read: All code comments
2. Study: lib/jobs/ and lib/playwright/
3. Modify: Test capturing behavior
4. Extend: Add new features

---

## 🚀 Next Level

After getting comfortable:

1. **Customize Tests**
   - Modify `lib/playwright/runner.ts`
   - Add custom assertions
   - Capture additional metrics

2. **Add Features**
   - Performance metrics
   - Accessibility checks
   - Visual regression testing
   - Custom test suites

3. **Scale Up**
   - Replace in-memory store with database
   - Add job queue (Bull, RabbitMQ)
   - Deploy multiple test workers
   - Add monitoring & alerting

4. **Production Ready**
   - Add authentication
   - Implement rate limiting
   - Set up error tracking
   - Configure CI/CD integration

---

**You're all set! 🎉 Start exploring! →** http://localhost:3000
