# UI Observer - Architecture & Component Diagram

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (User's Screen)                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐ │
│  │   TestDashboard (Main UI)    │    │   Test History & Details     │ │
│  │                              │    │                              │ │
│  │  ┌────────────────────────┐  │    │  - All previous tests        │ │
│  │  │  URL Input Form        │  │    │  - Status indicators         │ │
│  │  │  - Start Test Button   │  │    │  - Quick stats              │ │
│  │  └────────────────────────┘  │    │                              │ │
│  │                              │    └──────────────────────────────┘ │
│  │  ┌────────────────────────┐  │                                     │
│  │  │  SplitViewDashboard    │  │    ┌──────────────────────────────┐ │
│  │  │  (When test running)   │  │    │  Validation Result Details   │ │
│  │  │                        │  │    │  (When test complete)        │ │
│  │  │  ┌──────────┬────────┐ │  │    │                              │ │
│  │  │  │ Live UI  │Validation│ │  │    │  - Validation report        │ │
│  │  │  │ Preview  │ Results │ │  │    │  - Individual test results   │ │
│  │  │  │ (Left)   │ (Right)│ │  │    │  - Screenshots              │ │
│  │  │  └──────────┴────────┘ │  │    │  - Console errors           │ │
│  │  │                        │  │    │                              │ │
│  │  └────────────────────────┘  │    └──────────────────────────────┘ │
│  └──────────────────────────────┘                                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         ↑                                              ↑
         │                                              │
    React Components                            Event Listeners
         │                                              │
         └──────────────────────┬───────────────────────┘
                                │
                    Fetch API + SSE EventSource
                                │
                                ↓
┌────────────────────────────────────────────────────────────────────────┐
│                    Next.js Backend (Node.js)                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  API Routes:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  /api/run-test           (Start new test job)                │  │
│  │  /api/job-status         (Get job status)                    │  │
│  │  /api/screenshot         (Fetch screenshot image)            │  │
│  │  /api/test-stream        (SSE stream of test events)        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Core Services:                                                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Job Queue           │  │  Event Bus       │  │  Test        │  │
│  │  (queue.ts)          │  │  (events.ts)     │  │  Executor    │  │
│  │                      │  │                  │  │  (executor)  │  │
│  │  - Store jobs        │  │  - Emit events   │  │              │  │
│  │  - Track status      │  │  - Live updates  │  │  - Run jobs  │  │
│  │  - Store results     │  │  - Event history │  │  - Handle    │  │
│  │                      │  │                  │  │    errors    │  │
│  └──────────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                        │
│  Test Execution Pipeline:                                              │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Playwright Runner (runner.ts)                              │   │
│  │  ├─ Launch Browser                                          │   │
│  │  ├─ Navigate to URL                                         │   │
│  │  ├─ Capture Screenshot                                      │   │
│  │  ├─ Run Validation Tests (validation/executor.ts)           │   │
│  │  │  ├─ Element Visibility Tests (5)                         │   │
│  │  │  ├─ Form Input Tests (2)                                 │   │
│  │  │  ├─ Button State Tests (1)                               │   │
│  │  │  ├─ Accessibility Tests (1)                              │   │
│  │  │  ├─ Responsive Layout Tests (1)                          │   │
│  │  │  ├─ Color Contrast Tests (1)                             │   │
│  │  │  └─ Text Content Tests (1)                               │   │
│  │  ├─ Capture Errors (Console, Network, etc)                 │   │
│  │  ├─ Emit Events for Each Step                              │   │
│  │  └─ Return Complete Result                                 │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         ↑                                                    ↑
         │                                                    │
   Fetch API                                         Playwright Library
         │                                                    │
         └────────────────────────┬────────────────────────────┘
                                  │
                    Browser Automation & Testing
                                  │
                                  ↓
┌────────────────────────────────────────────────────────────────────────┐
│                         Playwright Engine                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Chromium Browser Instance (Headless)                           │ │
│  │  ├─ Isolate Context                                             │ │
│  │  ├─ Execute JavaScript                                          │ │
│  │  ├─ Capture DOM State                                           │ │
│  │  └─ Monitor Console/Network                                     │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         │
         │  Navigate to target URL
         │
         ↓
┌────────────────────────────────────────────────────────────────────────┐
│                    Target Website                                      │
│              cloud.seliseblocks.com/login                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     HTML Page                                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  Blocks Logo                                            │   │ │
│  │  │  ┌──────────────────────────────────────────────────┐  │   │ │
│  │  │  │  Login Form                                      │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │  Email: [_________________]                     │  │   │ │
│  │  │  │  Password: [_________________]                  │  │   │ │
│  │  │  │  [ ] Remember me                                │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │  [         Login Button         ]               │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │  Forgot Password? [link]                        │  │   │ │
│  │  │  └──────────────────────────────────────────────────┘  │   │ │
│  │  │                                                        │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Communication Flow

```
USER INTERACTION
      ↓
TestDashboard.tsx
  ├─ Handles URL input
  ├─ Submits test request to /api/run-test
  ├─ Polls /api/job-status for updates
  ├─ Shows test history
  └─ Conditionally renders SplitViewDashboard when running
      ↓
SplitViewDashboard.tsx (When Test Running)
  ├─ Connects to /api/test-stream (SSE)
  ├─ Receives live events from backend
  ├─ Updates left panel with screenshots
  └─ Updates right panel with validation results
      ├─ Passes validation report to ValidationResults.tsx
      │   └─ Displays test statistics
      │   └─ Shows individual test results (expandable)
      │   └─ Displays error messages and details
      └─ Shows console errors and status updates
```

---

## Data Structures

### Test Event Flow
```
Event Bus (testEventBus)
  ├─ emitted by: Playwright Runner
  ├─ types:
  │   ├─ "started" → Browser launching
  │   ├─ "navigating" → URL navigation
  │   ├─ "screenshot" → Page captured
  │   ├─ "validation-started" → Tests beginning
  │   ├─ "validation-progress" → Test N/M complete
  │   ├─ "validation-complete" → All tests done + report
  │   ├─ "console-error" → JS error captured
  │   ├─ "completed" → Test successful
  │   └─ "failed" → Test execution error
  │
  └─ transmitted via: SSE Stream (/api/test-stream)
      └─ received by: SplitViewDashboard
          └─ processed by: Event handlers
              └─ updates: UI state + display
```

### Job Result Structure
```
Job (from database/memory)
  ├─ id: string
  ├─ targetUrl: string
  ├─ status: "pending" | "running" | "completed" | "failed"
  ├─ createdAt: timestamp
  ├─ startedAt: timestamp
  ├─ completedAt: timestamp
  │
  └─ result?: TestResult
      ├─ passed: boolean
      ├─ pageLoadSuccess: boolean
      ├─ executionTimeMs: number
      ├─ screenshots: string[] (file paths)
      ├─ consoleErrors: Array<{level, message}>
      ├─ error?: string (if failed)
      │
      └─ validationReport?: UIValidationReport
          ├─ totalTests: 12
          ├─ passedTests: number
          ├─ failedTests: number
          ├─ criticalFailures: number
          ├─ overallPassed: boolean
          │
          └─ results: ValidationResult[]
              ├─ testId: string
              ├─ testName: string
              ├─ passed: boolean
              ├─ duration: number
              ├─ error?: string
              ├─ expected?: any
              └─ actual?: any
```

---

## File Dependencies

```
components/
  ├─ TestDashboard.tsx
  │   ├─ imports: SplitViewDashboard, LiveTestViewer
  │   ├─ imports: Job, JobStatus, TestResult (types)
  │   └─ uses: /api/run-test, /api/job-status
  │
  ├─ SplitViewDashboard.tsx (NEW)
  │   ├─ imports: ValidationResults
  │   ├─ imports: TestEvent, UIValidationReport (types)
  │   └─ uses: /api/test-stream (SSE)
  │
  ├─ ValidationResults.tsx (NEW)
  │   └─ imports: UIValidationReport, ValidationResult (types)
  │
  └─ LiveTestViewer.tsx
      ├─ imports: TestEvent (types)
      └─ uses: /api/test-stream (SSE)

lib/
  ├─ jobs/
  │   ├─ events.ts
  │   │   ├─ exports: TestEventBus, TestEvent, testEventBus
  │   │   └─ used by: runner.ts, test-stream route
  │   │
  │   ├─ types.ts
  │   │   ├─ exports: Job, TestResult, JobStatus
  │   │   ├─ imports: UIValidationReport (from validation/types)
  │   │   └─ used by: executor.ts, components
  │   │
  │   └─ executor.ts
  │       ├─ imports: runTest, testEventBus
  │       └─ used by: run-test route
  │
  ├─ playwright/
  │   └─ runner.ts
  │       ├─ imports: runValidationTests (from validation/executor)
  │       ├─ imports: testEventBus, TestEvent
  │       ├─ exports: runTest function
  │       └─ used by: executor.ts
  │
  └─ validation/
      ├─ types.ts (NEW)
      │   ├─ exports: ValidationTest, ValidationResult, UIValidationReport
      │   ├─ exports: DEFAULT_VALIDATION_TESTS (12 tests)
      │   └─ used by: executor.ts, runner.ts, components
      │
      └─ executor.ts (NEW)
          ├─ imports: ValidationTest, UIValidationReport (types)
          ├─ exports: runValidationTests function
          └─ used by: runner.ts

app/api/
  ├─ run-test/route.ts
  │   ├─ imports: executeJobInBackground, jobStore
  │   └─ creates: Job
  │
  ├─ job-status/route.ts
  │   └─ imports: jobStore
  │
  ├─ screenshot/route.ts
  │   └─ serves: image files
  │
  └─ test-stream/route.ts (MODIFIED)
      ├─ imports: testEventBus
      └─ streams: TestEvent via SSE
```

---

## Test Execution Sequence Diagram

```
Timeline:
─────────────────────────────────────────────────────────────────

Time 0s  User clicks "Start Test"
         │
         ├─→ POST /api/run-test
         │   └─→ Create Job (status: pending)
         │   └─→ Return jobId
         └─→ UI renders SplitViewDashboard
            └─→ Connect to SSE stream

Time 0.5s Executor starts
         │
         ├─ Emit: "started"
         │   └─→ UI shows: "Browser launching..."
         │
         └─ Launch Playwright

Time 1s   Browser ready
         │
         └─ Navigate to URL
            └─ Emit: "navigating"
               └─→ UI shows: "Loading: https://..."

Time 3s   Page loaded
         │
         ├─ Emit: "screenshot"
         │   └─→ Capture screenshot
         │   └─→ UI shows screenshot in left panel
         │
         └─ Run validation tests
            └─ Emit: "validation-started"
               └─→ UI shows: "Running validation tests..."

Time 3-5s Validation tests execute
         │
         ├─ Emit: "validation-progress" (per test)
         │   ├─→ Test 1: ✓ logo visible
         │   ├─→ Test 2: ✓ form visible
         │   ├─→ Test 3: ✓ email field
         │   └─→ ... (all 12 tests)
         │
         └─ UI updates right panel with results as they complete

Time 5s   Tests complete
         │
         ├─ Emit: "validation-complete"
         │   └─→ Includes full UIValidationReport
         │   └─→ UI updates with summary stats
         │
         └─ Emit: "completed"
            └─→ UI shows: "✅ Test completed!"
            └─→ Display final results
            └─→ Update job history

─────────────────────────────────────────────────────────────────
```

---

## Validation Test Execution (Detail)

```
ValidationTest 1: Logo Visible
  ├─ Selector: img[alt*='logo'], img[alt*='Blocks'], .logo
  ├─ Operation: page.locator().first().isVisible()
  ├─ Result: ✓ pass (duration: 45ms)
  └─ Emit event with result

ValidationTest 2: Login Form Visible
  ├─ Selector: form, [role='form'], .login-form
  ├─ Operation: page.locator().first().isVisible()
  ├─ Result: ✓ pass (duration: 38ms)
  └─ Emit event with result

ValidationTest 3: Email Input Visible
  ├─ Selector: input[type='email'], input[placeholder*='email'], ...
  ├─ Operation: page.locator().first().isVisible()
  ├─ Result: ✓ pass (duration: 35ms)
  └─ Emit event with result

... (9 more tests)

ValidationTest 12: Color Contrast
  ├─ Operation: Check text readability
  ├─ Result: ✓ pass (duration: 52ms)
  └─ Emit event with result

Aggregate Results:
  ├─ Total: 12
  ├─ Passed: 12
  ├─ Failed: 0
  ├─ Critical Failures: 0
  ├─ Overall Passed: true
  └─ Total Duration: 485ms

Final Report Emitted: "validation-complete"
```

---

## State Management

### Frontend State (React Components)

**SplitViewDashboard:**
```typescript
const [currentScreenshot, setCurrentScreenshot] = useState(null)
const [validationReport, setValidationReport] = useState(null)
const [currentAction, setCurrentAction] = useState("Initializing...")
const [consoleErrors, setConsoleErrors] = useState([])
```

**TestDashboard:**
```typescript
const [jobs, setJobs] = useState([])
const [selectedJobId, setSelectedJobId] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")
```

### Backend State (Node.js)

**In-Memory Storage:**
```
jobStore (Map<string, Job>)
  ├─ jobs: [Job, Job, Job, ...]
  └─ operations: get, add, update, getAll

testEventBus (EventEmitter)
  ├─ events: [TestEvent, TestEvent, ...]
  └─ listeners: [EventHandler, EventHandler, ...]
```

**File System:**
```
test-results/
  ├─ screenshot-{timestamp}.png
  ├─ screenshot-{timestamp}.png
  └─ error-screenshot-{timestamp}.png
```

---

**This architecture provides a clean separation of concerns with real-time data streaming for live UI testing and validation.**
