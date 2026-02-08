"use client";

/**
 * Live Test Viewer Component
 * 
 * Real-time visualization of Playwright test execution
 * Shows:
 * - Live screenshot updates
 * - Test execution progress
 * - Console errors/warnings
 * - Execution time
 * - Current action being performed
 */

import { useState, useEffect, useRef } from "react";
import { TestEvent } from "@/lib/jobs/events";

interface LiveTestViewerProps {
  jobId: string;
  targetUrl: string;
}

export default function LiveTestViewer({ jobId, targetUrl }: LiveTestViewerProps) {
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("Waiting...");
  const [consoleErrors, setConsoleErrors] = useState<Array<{ level: string; message: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource(
      `/api/test-stream?jobId=${encodeURIComponent(jobId)}`
    );

    eventSourceRef.current = eventSource;
    setIsConnected(true);
    setIsRunning(true);

    eventSource.onmessage = (event) => {
      try {
        const testEvent: TestEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, testEvent]);

        // Process different event types
        switch (testEvent.type) {
          case "started":
            setCurrentAction("🚀 Starting browser...");
            break;

          case "navigating":
            setCurrentAction(`📍 Navigating to ${testEvent.data.targetUrl}`);
            break;

          case "screenshot":
            setCurrentAction("📸 Capturing screenshot...");
            // Try to load the screenshot
            if (testEvent.data.screenshotPath) {
              // Convert file path to API endpoint to fetch screenshot
              const imagePath = `/api/screenshot?path=${encodeURIComponent(
                testEvent.data.screenshotPath
              )}`;
              setCurrentScreenshot(imagePath);
            }
            break;

          case "console-error":
            setCurrentAction("⚠️ Console error detected");
            setConsoleErrors((prev) => [
              ...prev,
              {
                level: testEvent.data.level,
                message: testEvent.data.message,
              },
            ]);
            break;

          case "completed":
            setCurrentAction("✅ Test completed successfully!");
            setIsRunning(false);
            setExecutionTime(testEvent.data.executionTimeMs);
            break;

          case "failed":
            setCurrentAction(`❌ Test failed: ${testEvent.data.error}`);
            setIsRunning(false);
            break;
        }
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsRunning(false);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  // Auto-scroll console errors
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleErrors]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white rounded">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">
            {isConnected ? "Live Stream Connected" : "Disconnected"}
          </span>
        </div>
        {isRunning && <span className="text-xs text-yellow-400">Running...</span>}
      </div>

      {/* Current Action */}
      <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
        <p className="font-medium text-blue-900">{currentAction}</p>
      </div>

      {/* Live Screenshot Viewport */}
      <div className="bg-black rounded-lg overflow-hidden shadow-lg">
        {currentScreenshot ? (
          <div className="relative">
            <img
              src={currentScreenshot}
              alt="Live test screenshot"
              className="w-full h-auto"
            />
            {isRunning && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">
                LIVE
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-96 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p>Waiting for screenshot...</p>
            </div>
          </div>
        )}
      </div>

      {/* Execution Time */}
      {executionTime > 0 && (
        <div className="px-4 py-2 bg-green-50 border-l-4 border-green-500 rounded text-sm">
          <p className="text-green-900">
            ⏱️ Execution time: <span className="font-bold">{(executionTime / 1000).toFixed(2)}s</span>
          </p>
        </div>
      )}

      {/* Console Errors */}
      {consoleErrors.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-700">Console Errors ({consoleErrors.length})</h3>
          <div
            ref={scrollRef}
            className="bg-red-50 border border-red-200 rounded p-3 max-h-48 overflow-y-auto"
          >
            {consoleErrors.map((error, idx) => (
              <div key={idx} className="mb-2 last:mb-0">
                <p className="text-xs font-mono text-red-800">
                  <span className="font-bold">[{error.level.toUpperCase()}]</span> {error.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-700">Event Log</h3>
        <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-40 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-xs text-gray-500">Waiting for events...</p>
          ) : (
            events.map((event, idx) => (
              <div key={idx} className="text-xs mb-1 last:mb-0 text-gray-600 font-mono">
                <span className="text-gray-400">[{event.type.toUpperCase()}]</span>{" "}
                <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Target URL Info */}
      <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
        <p>
          <span className="font-semibold">Target URL:</span> {targetUrl}
        </p>
      </div>
    </div>
  );
}
