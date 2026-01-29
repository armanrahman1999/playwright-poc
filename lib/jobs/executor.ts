/**
 * Background Job Executor
 * 
 * Executes test jobs asynchronously without blocking the request thread.
 * Design principle: API endpoint returns immediately with job ID,
 * then execution happens in the background.
 */

import { runTest } from "../playwright/runner";
import { jobStore } from "./queue";
import { Job } from "./types";

/**
 * Executes a test job in the background
 * This function is fire-and-forget - it returns immediately
 * while the test continues running
 */
export async function executeJobInBackground(job: Job): Promise<void> {
  // Update job to "running" state
  jobStore.updateJob(job.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  // Fire off the test without awaiting in the request context
  // This prevents the request from timing out
  setImmediate(async () => {
    try {
      // Run the Playwright test
      const result = await runTest(job.targetUrl, {
        headless: true,
        timeout: 30000,
        screenshotOnFailure: true,
        captureConsole: true,
      });

      // Update job with results
      jobStore.updateJob(job.id, {
        status: result.passed ? "completed" : "failed",
        result,
        completedAt: new Date().toISOString(),
      });

      console.log(`✓ Job ${job.id} completed - Pass: ${result.passed}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update job with error
      jobStore.updateJob(job.id, {
        status: "failed",
        error: errorMessage,
        completedAt: new Date().toISOString(),
      });

      console.error(`✗ Job ${job.id} failed:`, errorMessage);
    }
  });
}

/**
 * Cleanup utility: Remove old completed jobs from memory
 * Call this periodically to prevent memory bloat
 * (e.g., every hour via a cron job)
 */
export function cleanupOldJobs(ageMs: number = 3600000): void {
  const cleared = jobStore.clearOldCompletedJobs(ageMs);
  console.log(`Cleaned up ${cleared} old jobs from memory`);
}
