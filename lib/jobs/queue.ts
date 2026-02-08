/**
 * In-Memory Job Queue Manager with File Persistence
 * 
 * Manages test execution jobs with background processing.
 * Persists to file to survive hot reloads.
 */

import { Job, JobStore, JobStatus } from "./types";
import fs from "fs";
import path from "path";

class InMemoryJobStore implements JobStore {
  jobs: Map<string, Job> = new Map();
  private jobsFilePath: string;

  constructor() {
    this.jobsFilePath = path.join(process.cwd(), ".jobs-store.json");
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.jobsFilePath)) {
        const data = fs.readFileSync(this.jobsFilePath, "utf-8");
        const jobsArray = JSON.parse(data);
        this.jobs.clear();
        jobsArray.forEach((job: Job) => {
          this.jobs.set(job.id, job);
        });
      }
    } catch (error) {
      console.error("Failed to load jobs from file:", error);
    }
  }

  private saveToFile(): void {
    try {
      const jobsArray = Array.from(this.jobs.values());
      fs.writeFileSync(this.jobsFilePath, JSON.stringify(jobsArray, null, 2));
    } catch (error) {
      console.error("Failed to save jobs to file:", error);
    }
  }

  addJob(job: Job): void {
    this.jobs.set(job.id, job);
    this.saveToFile();
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
      this.saveToFile();
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

    this.saveToFile();
    return cleared;
  }
}

// Singleton instance - used throughout the app
const jobStore = new InMemoryJobStore();

export { jobStore, InMemoryJobStore };
