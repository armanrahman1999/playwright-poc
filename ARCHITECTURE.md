# UI Observer - Playwright Test Dashboard

A Next.js (App Router) web application that provides a dashboard to run Playwright end-to-end tests against remote URLs and display results in real-time.

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   TestDashboard Component (React)                        │   │
│  │   - Submit test URLs                                     │   │
│  │   - Poll job status (/api/job-status)                    │   │
│  │   - Display results                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP Requests
┌──────────────────────────▼──────────────────────────────────────┐
│                    Next.js Server (Node.js)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Routes (App Router)                                  │   │
│  │ - POST /api/run-test → Create job, return immediately    │   │
│  │ - GET  /api/job-status → Poll job progress              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────┐     │
│  │ Job Queue (In-Memory)                                 │     │
│  │ - Store: jobId → {status, result, metadata}          │     │
│  └────────────────────────┬──────────────────────────────┘     │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────┐     │
│  │ Background Executor (Fire-and-Forget)                 │     │
│  │ - executeJobInBackground() via setImmediate()         │     │
│  │ - Non-blocking request thread                         │     │
│  └────────────────────────┬──────────────────────────────┘     │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────┐     │
│  │ Playwright Test Runner (Server-Side ONLY)             │     │
│  │ - chromium.launch({ headless: true })                 │     │
│  │ - Isolated browser contexts per test                  │     │
│  │ - Capture: screenshots, console errors, timing        │     │
│  └────────────────────────┬──────────────────────────────┘     │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────┐     │
│  │ Remote URLs                                            │     │
│  │ https://example.com, https://app.example.com, etc.   │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Server-Side Only Playwright Execution**
   - Playwright runs in Node.js on the server only
   - Browser instances never created in the browser or Edge runtime
   - Prevents bundling Playwright into client code

2. **Non-Blocking Job Processing**
   - API endpoint returns immediately (202 Accepted)
   - Tests execute in background via `setImmediate()`
   - Request thread not blocked during test execution
   - UI polls backend for status updates

3. **In-Memory Job Store**
   - Current implementation: In-memory Map for simplicity
   - Local development focused
   - **For production**: Replace with persistent database (PostgreSQL, MongoDB)
   - Automatic cleanup of old jobs (configurable age threshold)

4. **Isolated Browser Contexts**
   - Each test gets its own browser context
   - Prevents cookie/storage leakage between tests
   - Automatic resource cleanup in finally block

5. **Comprehensive Result Collection**
   - ✅ Page load success/failure
   - ✅ Console errors and warnings
   - ✅ Screenshots on failure (and success)
   - ✅ Execution time (milliseconds)
   - ✅ Error messages with full stack traces
   - ✅ Timestamp for each test run

## Project Structure

```
d:\playwright\ui-observer\
│
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── run-test/
│   │   │   └── route.ts             # POST: Trigger new test job
│   │   └── job-status/
│   │       └── route.ts             # GET: Poll job status & results
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page (imports TestDashboard)
│   └── globals.css
│
├── components/
│   └── TestDashboard.tsx             # React dashboard component
│                                      # - Form to submit URLs
│                                      # - Job history list
│                                      # - Real-time results display
│
├── lib/
│   ├── jobs/
│   │   ├── types.ts                 # TypeScript types (Job, TestResult, etc.)
│   │   ├── queue.ts                 # In-memory job store (singleton)
│   │   └── executor.ts              # Background job executor
│   │
│   └── playwright/
│       └── runner.ts                # Playwright test runner
│                                    # - Browser launch & isolation
│                                    # - Page navigation & error capture
│                                    # - Screenshot management
│
├── tests/
│   └── example.spec.ts              # Example Playwright test (optional)
│
├── test-results/                    # Screenshots and test output
│
├── playwright.config.ts             # Playwright configuration
│                                    # Located outside app router
│                                    # Prevents client bundling
│
├── package.json
├── tsconfig.json
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Install Dependencies

```bash
npm install
# Already completed, but includes:
# - next@16.1.6
# - @playwright/test (latest)
# - playwright (latest)
# - react, react-dom, tailwindcss
```

### 2. Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to access the dashboard.

### 3. Build for Production

```bash
npm run build
npm run start
```

## Usage

### Via Dashboard UI

1. **Open http://localhost:3000**
2. **Enter a target URL** in the input field:
   - `https://example.com`
   - `https://github.com`
   - `https://your-app.com`
   - Any publicly accessible URL
3. **Click "Start Test"**
   - Test job created and queued
   - Dashboard returns immediately with job ID
   - Status shows as "pending" → "running" → "completed" or "failed"
4. **View Results**
   - Click a job to see details
   - View console errors, execution time, screenshots
   - Screenshots stored as files in `/test-results`

### Via API

#### Start a Test Job

```bash
curl -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'

# Response (202 Accepted):
# {
#   "jobId": "123e4567-e89b-12d3-a456-426614174000",
#   "status": "pending",
#   "message": "Test started in background. Poll /api/job-status for updates."
# }
```

#### Poll Job Status

```bash
curl http://localhost:3000/api/job-status?jobId=123e4567-e89b-12d3-a456-426614174000

# Response:
# {
#   "id": "123e4567-e89b-12d3-a456-426614174000",
#   "targetUrl": "https://example.com",
#   "status": "completed",
#   "result": {
#     "passed": true,
#     "pageLoadSuccess": true,
#     "executionTimeMs": 2847,
#     "consoleErrors": [],
#     "screenshots": ["test-results/screenshot-1706388014423.png"],
#     "timestamp": "2024-01-28T...",
#     "url": "https://example.com"
#   },
#   "createdAt": "2024-01-28T...",
#   "startedAt": "2024-01-28T...",
#   "completedAt": "2024-01-28T..."
# }
```

#### List All Jobs

```bash
curl http://localhost:3000/api/run-test

# Response:
# {
#   "totalJobs": 5,
#   "jobs": [
#     {
#       "id": "...",
#       "targetUrl": "https://example.com",
#       "status": "completed",
#       "createdAt": "...",
#       "startedAt": "...",
#       "completedAt": "..."
#     },
#     ...
#   ]
# }
```

## Data Flow

### 1. User Submits Test URL

```
User clicks "Start Test" with URL "https://example.com"
    ↓
POST /api/run-test with { targetUrl: "https://example.com" }
    ↓
API creates Job object with status="pending"
    ↓
Job stored in jobStore (in-memory Map)
    ↓
executeJobInBackground(job) called (async, non-blocking)
    ↓
API returns 202 Accepted with jobId
```

### 2. Background Test Execution

```
executeJobInBackground() runs in background via setImmediate()
    ↓
Job status → "running"
    ↓
runTest(targetUrl) launches Playwright:
  - chromium.launch({ headless: true })
  - Create isolated browser context
  - Navigate to URL with network idle
  - Capture console/page errors
  - Screenshot on failure
  - Collect execution time
    ↓
Test completes, results returned
    ↓
Job status → "completed" or "failed"
    ↓
Results stored in job.result
```

### 3. UI Polls for Updates

```
Dashboard polls /api/job-status?jobId=<id> every 1 second
    ↓
API returns current job status + results
    ↓
React component updates with new status/results
    ↓
User sees real-time progress and final results
```

## Configuration

### Playwright Options

Edit [playwright.config.ts](playwright.config.ts):

```typescript
// Parallel workers
const WORKERS = process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 1;

// Timeout for each test
const TEST_TIMEOUT = 30000; // 30 seconds

// Timeout for browser operations
const BROWSER_TIMEOUT = 15000; // 15 seconds
```

### Browser Launch Options

Edit [lib/playwright/runner.ts](lib/playwright/runner.ts):

```typescript
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-web-resources",
  ],
});
```

### Job Cleanup

Edit [lib/jobs/executor.ts](lib/jobs/executor.ts):

```typescript
// Auto-cleanup jobs older than 1 hour (in milliseconds)
cleanupOldJobs(3600000);
```

## Testing Remotely

The system supports testing any publicly accessible URL:

```
✅ https://github.com
✅ https://example.com
✅ https://your-production-app.com
✅ https://your-staging-app.com
✅ https://public-api-docs.com

❌ http://localhost:3000 (local dev server)
❌ http://192.168.1.100:3000 (private IP)
❌ http://company-internal.local (internal network)
```

**Note**: From your development machine, Playwright can only reach publicly accessible URLs. To test internal/private services, deploy this app on a server that can access them.

## Advanced Features (Future Enhancements)

### 1. Database Persistence
Replace in-memory store with PostgreSQL or MongoDB:
```typescript
// instead of jobStore (Map-based)
const job = await db.jobs.create({ targetUrl, status: "pending" });
```

### 2. WebSocket Real-Time Updates
Replace polling with WebSocket for instant updates:
```typescript
socket.on("job-update", (jobId, status, result) => {
  // Update UI in real-time
});
```

### 3. Test Scheduling
Run tests on a schedule using node-cron:
```typescript
cron.schedule("0 */6 * * *", async () => {
  // Run critical URLs every 6 hours
});
```

### 4. Performance Metrics
Capture Web Vitals using web-vitals library:
```typescript
const vitals = await page.evaluate(() => {
  return {
    LCP: largestContentfulPaint,
    FID: firstInputDelay,
    CLS: cumulativeLayoutShift,
  };
});
```

### 5. Accessibility Testing
Integrate axe accessibility checker:
```typescript
const results = await injectAxe(page);
const axeReport = await getViolations(page);
```

### 6. Visual Regression Testing
Combine with Percy or Chromatic for visual diffs:
```typescript
await percySnapshot(page, "Homepage");
```

## Common Issues & Troubleshooting

### 1. Playwright Chromium Not Available
```bash
# Install Chromium browser
npx playwright install chromium
```

### 2. Port 3000 Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

### 3. Timeout Errors
- Increase timeout in [playwright.config.ts](playwright.config.ts)
- Check if target URL is responsive
- Verify network connectivity

### 4. Screenshots Not Saving
- Ensure `/test-results` directory exists
- Check file permissions
- Verify disk space available

### 5. Memory Usage Growing
- Call `cleanupOldJobs()` periodically
- Replace in-memory store with database
- Limit number of concurrent tests

## Performance Considerations

### Local Development
- **1 worker** (default) - prevents resource contention
- Tests run sequentially
- Single browser instance at a time
- Memory usage: ~200-300MB per browser

### Production
1. **Scale to multiple workers** (if needed)
   ```bash
   PLAYWRIGHT_WORKERS=4 npm run start
   ```

2. **Use persistent database** instead of in-memory store

3. **Implement job queue** (Bull, RabbitMQ, AWS SQS)

4. **Add monitoring** (error tracking, performance metrics)

5. **Set up cleanup jobs** to remove old test results

## Environment Variables

```bash
# Optional: Control number of parallel test workers
PLAYWRIGHT_WORKERS=1

# Optional: Custom Playwright browser binary path
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers

# Optional: Disable browser sandbox (some environments)
PLAYWRIGHT_DISABLE_SANDBOX=1
```

## File Structure Details

### API Routes (App Router)

**POST /api/run-test**
- Creates new Job with unique UUID
- Stores in jobStore
- Triggers background execution
- Returns 202 (Accepted) immediately
- Non-blocking

**GET /api/run-test**
- Lists all jobs
- Returns job summaries
- Useful for debugging

**GET /api/job-status?jobId=**
- Polls job progress
- Returns full results when complete
- Called by dashboard every 1 second

### Job Lifecycle

```
pending → running → completed (success) / failed (error)
  ↓        ↓            ↓
  Queue    Exec      Results
           Playwright
```

## Comments in Code

Key files have extensive inline comments explaining:
- Design decisions
- Architecture patterns
- Why certain approaches were chosen
- What happens server-side vs client-side
- How to extend or modify behavior

## Next Steps for Production

1. ✅ Test with real URLs (already working)
2. Replace in-memory store with PostgreSQL
3. Add authentication (if needed)
4. Implement job persistence (run history)
5. Add performance metrics collection
6. Set up error tracking (Sentry)
7. Add logging (Winston, Pino)
8. Deploy to production (Vercel, AWS, etc.)
9. Set up scheduled test runs
10. Integrate with CI/CD pipeline

## License

MIT - Feel free to use and modify for your needs.
