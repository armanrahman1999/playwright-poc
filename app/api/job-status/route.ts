/**
 * GET /api/job-status?jobId=<id>
 * 
 * Polls the status of a test job.
 * Client can poll this endpoint to get real-time updates.
 * 
 * Response includes:
 * - Job status (pending, running, completed, failed)
 * - Full test results when completed
 * - Execution time
 * - Screenshots and errors
 */

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/jobs/queue";

export async function GET(request: NextRequest) {
  try {
    // Get jobId from query parameter
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: "jobId"' },
        { status: 400 }
      );
    }

    // Look up job
    const job = jobStore.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", jobId },
        { status: 404 }
      );
    }

    // Return job status and results
    return NextResponse.json({
      id: job.id,
      targetUrl: job.targetUrl,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result || null,
      error: job.error || null,
    });
  } catch (error) {
    console.error("Error in /api/job-status:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to fetch job status", details: errorMessage },
      { status: 500 }
    );
  }
}
