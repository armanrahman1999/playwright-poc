/**
 * Test Event Emitter System
 * 
 * Allows real-time streaming of test execution progress to connected clients
 * Uses a simple in-memory event bus for local development
 */

import { EventEmitter } from "events";

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

  /**
   * Emit a test event to all listeners
   */
  emitTestEvent(event: TestEvent) {
    // Store event in memory for late subscribers
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

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
