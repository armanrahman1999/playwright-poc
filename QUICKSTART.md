# Quick Start Guide

## Get Started in 5 Minutes

### 1. Start Development Server

```bash
npm run dev
```

You'll see:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Environments: .env.local
```

### 2. Open Dashboard

Visit **http://localhost:3000** in your browser

You should see:
- Title: "Test Observer"
- Form: "Start New Test"
- Input field for "Target URL"

### 3. Run Your First Test

Enter any public URL:
```
https://github.com
https://example.com
https://vercel.com
```

Click **"Start Test"**

### 4. Watch Results

The dashboard will show:
- **Status**: pending → running → completed
- **Execution time**: How long the test took
- **Page load**: ✓ Success or ✗ Failed
- **Console errors**: Any JavaScript errors captured
- **Screenshots**: Visual capture of the page

### 5. Try More Features

- Submit multiple URLs at once
- Check test history in the left panel
- Click any job to see detailed results
- Monitor execution in real-time

---

## What's Happening Behind the Scenes

```
Your Input (URL)
    ↓
POST /api/run-test
    ↓
Server creates Job (unique ID)
    ↓
Returns 202 Accepted immediately
    ↓
Playwright runs in background (server-side)
    ↓
Browser launches, navigates to URL
    ↓
Captures: page load status, console errors, screenshots
    ↓
Results stored in job database
    ↓
Dashboard polls every 1 second
    ↓
UI updates with real-time progress
    ↓
You see results!
```

---

## Key Points

✅ **Playwright runs server-side only** - Not in browser
✅ **Non-blocking** - API returns immediately
✅ **Real-time dashboard** - Updates every second
✅ **Captures everything** - Screenshots, errors, timing
✅ **Remote URLs** - Tests any public URL
✅ **Headless mode** - No browser GUI needed

---

## Troubleshooting

### Port 3000 already in use?
```bash
npm run dev -- -p 3001
# Then visit http://localhost:3001
```

### Build errors?
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Playwright not installed?
```bash
npx playwright install chromium
```

---

## Next Steps

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for full details
2. Explore API endpoints:
   - `POST /api/run-test`
   - `GET /api/job-status?jobId=<id>`
   - `GET /api/run-test`
3. Customize for your use case
4. Deploy to production

---

## Architecture in Brief

```
Browser (Client)
↓ (Submit URL via form)
Next.js API Route
↓ (Return job ID immediately)
In-Memory Job Queue
↓ (Background execution)
Playwright Browser
↓ (Test remote URL)
Results Saved
↓ (Dashboard polls)
Real-Time UI Updates
```

---

## File Structure

- `app/page.tsx` - Dashboard page
- `components/TestDashboard.tsx` - React component
- `app/api/run-test/route.ts` - API to start tests
- `app/api/job-status/route.ts` - API to check status
- `lib/jobs/queue.ts` - Job storage
- `lib/jobs/executor.ts` - Background runner
- `lib/playwright/runner.ts` - Playwright wrapper
- `playwright.config.ts` - Browser config

---

Happy testing! 🚀
