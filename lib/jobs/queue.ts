/**
 * In-Memory Job Queue Manager
 * 
 * Manages test execution jobs with background processing.
 * Note: This is an in-memory store. For production, replace with
 * a persistent database (PostgreSQL, MongoDB, etc.)
 */

import { Job, JobStore, JobStatus } from "./types";

class InMemoryJobStore implements JobStore {
  jobs: Map<string, Job> = new Map();

  addJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  // Get jobs by status (useful for dashboard)
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  // Clear completed jobs older than X milliseconds (cleanup utility)
  clearOldCompletedJobs(ageMs: number = 3600000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === "completed" || job.status === "failed") &&
        job.completedAt
      ) {
        const jobAge = now - new Date(job.completedAt).getTime();
        if (jobAge > ageMs) {
          this.jobs.delete(id);
          cleared++;
        }
      }
    }

    return cleared;
  }
}

// Singleton instance - used throughout the app
const jobStore = new InMemoryJobStore();

export { jobStore, InMemoryJobStore };
