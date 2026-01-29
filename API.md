# API Reference

Complete API documentation for the UI Observer test runner.

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. POST /api/run-test

Triggers a new test job against a target URL.

**Returns immediately** with job ID (202 Accepted).
Test execution happens in the background.

#### Request

```bash
curl -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com"
  }'
```

#### Request Body

| Field | Type | Required | Example |
|-------|------|----------|---------|
| targetUrl | string | Yes | `"https://example.com"` |

#### Response (202 Accepted)

```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Test started in background. Poll /api/job-status for updates."
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| jobId | string | Unique job identifier (UUID) |
| status | string | Job status: "pending" |
| message | string | Human-readable message |

#### Error Responses

**400 Bad Request** - Missing or invalid URL
```json
{
  "error": "Invalid URL format"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to start test",
  "details": "Error message"
}
```

#### Notes

- Returns immediately without waiting for test completion
- Use the `jobId` to poll status via `/api/job-status`
- Tests run server-side only (Playwright in Node.js)
- Maximum execution time: 30 seconds per test
- Screenshots and console errors are captured automatically

---

### 2. GET /api/job-status

Polls the current status of a test job.

#### Request

```bash
curl http://localhost:3000/api/job-status?jobId=123e4567-e89b-12d3-a456-426614174000
```

#### Query Parameters

| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| jobId | string | Yes | `"123e4567-e89b-12d3-a456-426614174000"` |

#### Response (200 OK)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "targetUrl": "https://example.com",
  "status": "completed",
  "createdAt": "2024-01-28T10:30:00.000Z",
  "startedAt": "2024-01-28T10:30:01.000Z",
  "completedAt": "2024-01-28T10:30:05.000Z",
  "error": null,
  "result": {
    "passed": true,
    "pageLoadSuccess": true,
    "consoleErrors": [
      {
        "level": "warning",
        "message": "Unused variable"
      }
    ],
    "screenshots": [
      "test-results/screenshot-1706388000000.png"
    ],
    "executionTimeMs": 2847,
    "url": "https://example.com",
    "timestamp": "2024-01-28T10:30:05.000Z"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Job ID |
| targetUrl | string | URL being tested |
| status | string | One of: "pending", "running", "completed", "failed" |
| createdAt | string | ISO timestamp when job created |
| startedAt | string | ISO timestamp when test started |
| completedAt | string | ISO timestamp when test completed |
| error | string \| null | Error message if test failed |
| result | object \| null | Test results (see below) |

#### Result Object

| Field | Type | Description |
|-------|------|-------------|
| passed | boolean | True if page loaded without errors |
| pageLoadSuccess | boolean | True if HTTP status < 400 |
| consoleErrors | array | Array of console messages (errors/warnings) |
| screenshots | array | Array of screenshot file paths |
| executionTimeMs | number | Execution time in milliseconds |
| url | string | URL that was tested |
| timestamp | string | ISO timestamp of result |

#### Console Error Format

```json
{
  "level": "error",
  "message": "Uncaught: Cannot read property 'foo' of undefined"
}
```

Valid levels: `"error"`, `"warning"`, `"log"`, `"info"`, `"debug"`

#### Status Progression

```
pending     → Initial state, waiting to run
running     → Test is currently executing
completed   → Test completed successfully
failed      → Test failed with error
```

#### Error Responses

**404 Not Found** - Job ID doesn't exist
```json
{
  "error": "Job not found",
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**400 Bad Request** - Missing jobId parameter
```json
{
  "error": "Missing required query parameter: \"jobId\""
}
```

#### Notes

- Poll this endpoint to check test progress
- Dashboard polls every 1 second
- Result is `null` while test is "pending" or "running"
- Screenshots are stored as files on server
- Console errors captured during page load

---

### 3. GET /api/run-test

Lists all test jobs (useful for debugging).

#### Request

```bash
curl http://localhost:3000/api/run-test
```

#### Response (200 OK)

```json
{
  "totalJobs": 3,
  "jobs": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "targetUrl": "https://github.com",
      "status": "completed",
      "createdAt": "2024-01-28T10:25:00.000Z",
      "startedAt": "2024-01-28T10:25:01.000Z",
      "completedAt": "2024-01-28T10:25:05.000Z"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "targetUrl": "https://example.com",
      "status": "running",
      "createdAt": "2024-01-28T10:30:00.000Z",
      "startedAt": "2024-01-28T10:30:01.000Z"
    },
    {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "targetUrl": "https://vercel.com",
      "status": "pending",
      "createdAt": "2024-01-28T10:35:00.000Z"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| totalJobs | number | Count of all jobs |
| jobs | array | Array of job summaries |

#### Job Summary Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Job ID |
| targetUrl | string | URL being tested |
| status | string | Current job status |
| createdAt | string | ISO timestamp when created |
| startedAt | string | ISO timestamp when started |
| completedAt | string | ISO timestamp when completed |

#### Notes

- Includes all jobs in memory (pending, running, completed, failed)
- Does not include full test results (use `/api/job-status` for that)
- Useful for debugging and monitoring

---

## Examples

### Example 1: Basic Test Run

```bash
# Start test
curl -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'

# Response:
# {
#   "jobId": "abc123...",
#   "status": "pending"
# }

# Poll for results (repeat every 1 second)
curl http://localhost:3000/api/job-status?jobId=abc123...

# Response after completion:
# {
#   "status": "completed",
#   "result": {
#     "passed": true,
#     "pageLoadSuccess": true,
#     "executionTimeMs": 2847,
#     ...
#   }
# }
```

### Example 2: Test Multiple URLs

```bash
# Start 3 tests
JOB1=$(curl -s -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://github.com"}' | jq -r '.jobId')

JOB2=$(curl -s -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}' | jq -r '.jobId')

JOB3=$(curl -s -X POST http://localhost:3000/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://vercel.com"}' | jq -r '.jobId')

# Poll all at once
curl "http://localhost:3000/api/job-status?jobId=$JOB1"
curl "http://localhost:3000/api/job-status?jobId=$JOB2"
curl "http://localhost:3000/api/job-status?jobId=$JOB3"
```

### Example 3: Check Job History

```bash
curl http://localhost:3000/api/run-test | jq '.jobs[] | {id, targetUrl, status}'

# Output:
# {
#   "id": "123e4567...",
#   "targetUrl": "https://github.com",
#   "status": "completed"
# }
# {
#   "id": "223e4567...",
#   "targetUrl": "https://example.com",
#   "status": "running"
# }
```

---

## Rate Limiting

Currently **no rate limiting** is implemented.

For production, add middleware to limit requests:
- Max 10 tests/minute per IP
- Max 5 concurrent tests
- Max 1000 jobs in memory

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Successful GET request |
| 202 | Test job accepted (POST /api/run-test) |
| 400 | Bad request (invalid data) |
| 404 | Job not found |
| 500 | Server error |

---

## Performance

### Timing

- **Response time (submit)**: < 100ms
- **Test execution**: 1-5 seconds typical
- **Polling frequency**: 1 second (dashboard)
- **Screenshot capture**: Included in execution time

### Limits

- **Max execution time**: 30 seconds per test
- **Max concurrent tests**: 1 (local dev)
- **Max jobs in memory**: Unlimited (clean up manually)
- **Screenshot size**: ~200-500KB per page

---

## Error Handling

### Network Errors

If test can't reach URL:
```json
{
  "status": "failed",
  "error": "net::ERR_NAME_NOT_RESOLVED"
}
```

### Timeout

If test takes > 30 seconds:
```json
{
  "status": "failed",
  "error": "Timeout waiting for navigation"
}
```

### Invalid URL

```json
{
  "status": 400,
  "error": "Invalid URL format"
}
```

---

## Future Enhancements

Planned for future versions:
- [ ] Authentication
- [ ] Rate limiting
- [ ] Webhook callbacks
- [ ] Scheduled tests
- [ ] Performance metrics (Web Vitals)
- [ ] Accessibility testing (axe)
- [ ] Visual regression (Percy)
- [ ] Database persistence

---

## Support

For issues or questions:
1. Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
2. See [QUICKSTART.md](QUICKSTART.md) for examples
3. Review inline code comments for implementation details
