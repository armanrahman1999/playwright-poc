/**
 * Types for the job queue system
 * Handles test execution job management
 */

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface TestResult {
  passed: boolean;
  pageLoadSuccess: boolean;
  consoleErrors: Array<{ level: string; message: string }>;
  screenshots: string[]; // Base64 encoded or file paths
  executionTimeMs: number;
  error?: string;
  url?: string;
  timestamp: string;
}

export interface Job {
  id: string;
  targetUrl: string;
  status: JobStatus;
  result?: TestResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface JobStore {
  jobs: Map<string, Job>;
  addJob(job: Job): void;
  getJob(id: string): Job | undefined;
  updateJob(id: string, updates: Partial<Job>): void;
  getAllJobs(): Job[];
}
