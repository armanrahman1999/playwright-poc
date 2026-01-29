"use client";

/**
 * TestDashboard Component
 * 
 * Client-side dashboard for:
 * - Submitting test URLs
 * - Viewing test history
 * - Polling for job status updates
 * - Displaying test results with screenshots
 * 
 * Uses polling via setInterval instead of websockets (simpler, local-only)
 */

import { useState, useEffect, useRef } from "react";
import { Job, JobStatus, TestResult } from "@/lib/jobs/types";

interface JobWithResult extends Job {
  result?: TestResult;
}

export default function TestDashboard() {
  const [targetUrl, setTargetUrl] = useState("https://cloud.seliseblocks.com/login");
  const [jobs, setJobs] = useState<JobWithResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all jobs from the server
  const fetchAllJobs = async () => {
    try {
      const response = await fetch("/api/run-test");
      if (!response.ok) throw new Error("Failed to fetch jobs");

      const data = await response.json();

      // Now fetch detailed status for each job
      const jobsWithDetails = await Promise.all(
        data.jobs.map(async (job: Job) => {
          const statusResponse = await fetch(`/api/job-status?jobId=${job.id}`);
          if (statusResponse.ok) {
            return statusResponse.json();
          }
          return job;
        })
      );

      setJobs(jobsWithDetails);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  // Submit new test
  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!targetUrl.trim()) {
        throw new Error("Please enter a target URL");
      }

      const response = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: targetUrl.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start test");
      }

      const data = await response.json();
      setTargetUrl("");
      setSelectedJobId(data.jobId);

      // Refresh jobs list
      await fetchAllJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Set up polling for job updates
  useEffect(() => {
    // Initial fetch
    fetchAllJobs();

    // Poll every 1 second
    pollIntervalRef.current = setInterval(fetchAllJobs, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const selectedJob = selectedJobId
    ? jobs.find((j) => j.id === selectedJobId)
    : null;

  const getStatusColor = (status: JobStatus): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
    }
  };

  const getStatusIcon = (status: JobStatus): string => {
    switch (status) {
      case "pending":
        return "⏳";
      case "running":
        return "⚙️";
      case "completed":
        return "✓";
      case "failed":
        return "✗";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Blocks Cloud - Login Tester</h1>
          <p className="text-slate-400">
            Automated Playwright tests for cloud.seliseblocks.com/login
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Start New Test
              </h2>

              <form onSubmit={handleSubmitTest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Target URL
                  </label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://cloud.seliseblocks.com/login"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition"
                >
                  {loading ? "Starting..." : "Start Test"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Quick Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Jobs:</span>
                    <span className="text-white font-semibold">{jobs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Passed:</span>
                    <span className="text-green-400 font-semibold">
                      {jobs.filter((j) => j.status === "completed").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Failed:</span>
                    <span className="text-red-400 font-semibold">
                      {jobs.filter((j) => j.status === "failed").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Running:</span>
                    <span className="text-blue-400 font-semibold">
                      {jobs.filter((j) => j.status === "running").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Jobs List & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Jobs List */}
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">Test History</h2>
              </div>

              <div className="divide-y divide-slate-700">
                {jobs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No tests yet. Submit a URL to get started!
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-4 cursor-pointer hover:bg-slate-700 transition ${
                        selectedJobId === job.id ? "bg-slate-700" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white font-medium truncate">
                            {job.targetUrl}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ml-2 whitespace-nowrap ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {getStatusIcon(job.status)} {job.status}
                        </span>
                      </div>

                      {job.result && (
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div className="text-slate-400">
                            Time:{" "}
                            <span className="text-slate-300">
                              {job.result.executionTimeMs}ms
                            </span>
                          </div>
                          <div className="text-slate-400">
                            Errors:{" "}
                            <span
                              className={
                                job.result.consoleErrors.length === 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {job.result.consoleErrors.length}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            Screenshots:{" "}
                            <span className="text-slate-300">
                              {job.result.screenshots.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Job Details */}
            {selectedJob && (
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700">
                  <h2 className="text-xl font-semibold text-white">
                    Test Details
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      URL
                    </h3>
                    <p className="text-white break-all">{selectedJob.targetUrl}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      Status
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${getStatusColor(
                        selectedJob.status
                      )}`}
                    >
                      {getStatusIcon(selectedJob.status)} {selectedJob.status}
                    </span>
                  </div>

                  {selectedJob.result && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">
                            Execution Time
                          </h3>
                          <p className="text-white">
                            {selectedJob.result.executionTimeMs}ms
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">
                            Page Load
                          </h3>
                          <p
                            className={
                              selectedJob.result.pageLoadSuccess
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {selectedJob.result.pageLoadSuccess
                              ? "Success"
                              : "Failed"}
                          </p>
                        </div>
                      </div>

                      {selectedJob.result.consoleErrors.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">
                            Console Errors ({selectedJob.result.consoleErrors.length})
                          </h3>
                          <div className="bg-slate-900 rounded p-3 max-h-40 overflow-y-auto">
                            <ul className="space-y-1 text-xs">
                              {selectedJob.result.consoleErrors.map((err, idx) => (
                                <li key={idx} className="text-red-400">
                                  <span className="font-semibold">[{err.level}]</span>{" "}
                                  {err.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {selectedJob.result.screenshots.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">
                            Screenshots ({selectedJob.result.screenshots.length})
                          </h3>
                          <div className="space-y-2">
                            {selectedJob.result.screenshots.map((screenshot, idx) => {
                              // Extract filename from full path
                              const filename = screenshot.split("\\").pop() || screenshot.split("/").pop() || screenshot;
                              const screenshotUrl = `/api/screenshot?filename=${filename}`;
                              return (
                                <div key={idx} className="bg-slate-900 rounded p-2">
                                  <p className="text-xs text-slate-400 mb-2 break-all">
                                    {filename}
                                  </p>
                                  <a
                                    href={screenshotUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-xs"
                                  >
                                    View Screenshot
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedJob.error && (
                        <div>
                          <h3 className="text-sm font-semibold text-slate-300 mb-2">
                            Error
                          </h3>
                          <div className="bg-red-900 border border-red-700 rounded p-3 text-red-200 text-sm break-all">
                            {selectedJob.error}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-slate-400 space-y-1 pt-4 border-t border-slate-700">
                        <p>Created: {new Date(selectedJob.createdAt).toLocaleString()}</p>
                        {selectedJob.startedAt && (
                          <p>
                            Started: {new Date(selectedJob.startedAt).toLocaleString()}
                          </p>
                        )}
                        {selectedJob.completedAt && (
                          <p>
                            Completed:{" "}
                            {new Date(selectedJob.completedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
