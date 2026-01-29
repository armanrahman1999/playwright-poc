/**
 * POST /api/run-test
 * 
 * Triggers a new test job against a target URL.
 * Returns immediately with a job ID - test execution happens in background.
 * 
 * Request body: { targetUrl: string }
 * Response: { jobId: string; status: "pending" }
 */

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/jobs/queue";
import { executeJobInBackground } from "@/lib/jobs/executor";
import { Job } from "@/lib/jobs/types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl } = body;

    // Validate input
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing required field: "targetUrl"' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Create new job
    const jobId = crypto.randomUUID();
    const job: Job = {
      id: jobId,
      targetUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Store job
    jobStore.addJob(job);

    // Execute test in background (fire-and-forget)
    // This returns immediately without waiting for test completion
    executeJobInBackground(job);

    // Return immediately with job ID
    // Client can poll /api/job-status?jobId=<id> for results
    return NextResponse.json(
      {
        jobId,
        status: "pending",
        message: "Test started in background. Poll /api/job-status for updates.",
      },
      { status: 202 } // 202 Accepted - request accepted for processing
    );
  } catch (error) {
    console.error("Error in /api/run-test:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to start test", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/run-test (optional)
 * Returns list of all test jobs (useful for debugging)
 */
export async function GET() {
  try {
    const jobs = jobStore.getAllJobs();

    return NextResponse.json({
      totalJobs: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        targetUrl: job.targetUrl,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        // Don't include full result in list view
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/run-test:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
