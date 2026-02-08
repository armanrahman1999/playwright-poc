/**
 * Test Event Emitter System with File Persistence
 * 
 * Allows real-time streaming of test execution progress to connected clients
 * Persists events to file to survive hot reloads
 */

import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

export interface TestEvent {
  jobId: string;
  type:
    | "started"
    | "navigating"
    | "screenshot"
    | "console-log"
    | "console-error"
    | "validation-started"
    | "validation-progress"
    | "validation-complete"
    | "completed"
    | "failed";
  timestamp: string;
  data: any;
}

class TestEventBus extends EventEmitter {
  private events: TestEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events in memory
  private eventsFilePath: string;

  constructor() {
    super();
    this.eventsFilePath = path.join(process.cwd(), ".events-store.json");
    this.loadEventsFromFile();
    
    // Watch for file changes to sync events between processes
    this.startFileWatcher();
  }

  private startFileWatcher() {
    try {
        if (!fs.existsSync(this.eventsFilePath)) {
            // Create empty file if not exists so we can watch it
            fs.writeFileSync(this.eventsFilePath, "[]");
        }

        // Poll every 500ms - safer than fs.watch in some envs and sufficient for this UI
        setInterval(() => {
            this.syncFromFile();
        }, 500);
    } catch (e) {
        console.error("Failed to start event file watcher:", e);
    }
  }

  private syncFromFile() {
    try {
        if (fs.existsSync(this.eventsFilePath)) {
            const data = fs.readFileSync(this.eventsFilePath, "utf-8");
            const fileEvents: TestEvent[] = JSON.parse(data);
            
            // Should be optimized but fine for <1000 items
            if (fileEvents.length > this.events.length) {
                // Find new events
                const newEvents = fileEvents.slice(this.events.length);
                
                // Update local memory without triggering save
                this.events = fileEvents;

                // Emit events to local listeners
                newEvents.forEach(event => {
                     this.emit(`test:${event.jobId}`, event);
                     this.emit("test:*", event);
                });
            } else if (fileEvents.length < this.events.length) {
                // If file is smaller (maybe reset?), just reload
                 this.events = fileEvents;
            }
        }
    } catch (error) {
        // Ignore read errors (racing)
    }
  }

  private loadEventsFromFile(): void {
    try {
      if (fs.existsSync(this.eventsFilePath)) {
        const data = fs.readFileSync(this.eventsFilePath, "utf-8");
        this.events = JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load events from file:", error);
      this.events = [];
    }
  }

  private saveEventsToFile(): void {
    try {
      fs.writeFileSync(this.eventsFilePath, JSON.stringify(this.events, null, 2));
    } catch (error) {
      console.error("Failed to save events to file:", error);
    }
  }

  /**
   * Emit a test event to all listeners
   */
  emitTestEvent(event: TestEvent) {
    // Reload first to ensure we have latest state before appending
    // This prevents overwriting events from other processes
    try {
        if (fs.existsSync(this.eventsFilePath)) {
             const data = fs.readFileSync(this.eventsFilePath, "utf-8");
             const fileEvents = JSON.parse(data);
             if (Array.isArray(fileEvents)) {
                 this.events = fileEvents;
             }
        }
    } catch(e) {}

    // Store event in memory for late subscribers
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Persist to file
    this.saveEventsToFile();

    // Broadcast to all listeners
    this.emit(`test:${event.jobId}`, event);
    this.emit("test:*", event);
  }

  /**
   * Get recent events for a job (for late subscribers)
   */
  getRecentEvents(jobId: string, limit: number = 50): TestEvent[] {
    return this.events
      .filter((e) => e.jobId === jobId)
      .slice(-limit);
  }

  /**
   * Subscribe to a specific job's events
   */
  onJobEvent(jobId: string, callback: (event: TestEvent) => void) {
    this.on(`test:${jobId}`, callback);
    return () => this.off(`test:${jobId}`, callback);
  }

  /**
   * Subscribe to all test events
   */
  onAllEvents(callback: (event: TestEvent) => void) {
    this.on("test:*", callback);
    return () => this.off("test:*", callback);
  }
}

// Export singleton instance
export const testEventBus = new TestEventBus();
