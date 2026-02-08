"use client";

/**
 * Full-View Live Test Dashboard
 * 
 * Shows live UI preview in full view with validation results below
 * - Large viewport for live screenshot from Playwright
 * - Validation test results displayed below in full width
 */

import { useState, useEffect } from "react";
import { TestEvent } from "@/lib/jobs/events";
import { UIValidationReport } from "@/lib/validation/types";
import ValidationResults from "./ValidationResults";

interface SplitViewDashboardProps {
  jobId: string;
  targetUrl?: string;
  isRunning: boolean;
}

export default function SplitViewDashboard({
  jobId,
  targetUrl,
  isRunning,
}: SplitViewDashboardProps) {
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<UIValidationReport | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("Initializing...");
  const [consoleErrors, setConsoleErrors] = useState<Array<{ level: string; message: string }>>([]);
  const [showConsolePanel, setShowConsolePanel] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log("[SplitViewDashboard] Component mounted with jobId:", jobId);
    
    // Connect to SSE stream
    const eventSource = new EventSource(
      `/api/job-stream?jobId=${encodeURIComponent(jobId)}`
    );

    console.log("[SplitViewDashboard] Connecting to SSE:", jobId);

    eventSource.onmessage = (event) => {
      try {
        const testEvent: TestEvent = JSON.parse(event.data);
        console.log("[SplitViewDashboard] Received event:", testEvent.type, testEvent.data);

        switch (testEvent.type) {
          case "started":
            setCurrentAction("🚀 Browser launching... (Recording Video)");
            break;

          case "navigating":
            setCurrentAction(`📍 Loading: ${testEvent.data.targetUrl}`);
            break;

          case "screenshot":
            // Legacy handling if screenshots are still sent
            const screenshotPath = testEvent.data.screenshotPath;
            if (screenshotPath) {
               // Ignore screenshots in video mode, or keep as thumbnail
            }
            break;

          case "validation-started":
            setCurrentAction("🎬 Starting automated tour...");
            break;

          case "validation-progress":
             setCurrentAction(
              `🎬 Visiting page ${testEvent.data.current}/${testEvent.data.total}`
            );
            break;

          case "validation-complete":
            setCurrentAction("✅ Tour complete. Processing video...");
            break;

          case "console-error":
            setCurrentAction("⚠️ Console error detected");
            break;

          case "completed":
            setCurrentAction("✅ Session recorded!");
            if (testEvent.data.videoPath) {
                setVideoUrl(testEvent.data.videoPath);
            }
            break;

          case "failed":
            setCurrentAction(`❌ Test failed: ${testEvent.data.error}`);
            break;
        }
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      // Don't change status on error, might just be end of stream
    };

    return () => {
      console.log("[SplitViewDashboard] Closing SSE connection");
      eventSource.close();
    };
  }, [jobId]);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white rounded">
        <div className="text-sm">{currentAction}</div>
        {isRunning && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">RECORDING</span>
          </div>
        )}
      </div>

      {/* Full Width Live UI Preview */}
      <div className="bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700 min-h-[400px] flex flex-col justify-center items-center">
        {videoUrl ? (
             <div className="w-full">
                <video controls autoPlay className="w-full h-auto max-h-[600px] mx-auto">
                    <source src={videoUrl} type="video/webm" />
                    Your browser does not support the video tag.
                </video>
             </div>
        ) : isRunning ? (
             <div className="text-center p-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-blue-500 mb-4"></div>
                <h3 className="text-xl font-semibold text-white mb-2">Recording in progress...</h3>
                <p className="text-slate-400">The automated browser is touring the site.</p>
                <p className="text-slate-500 text-sm mt-4">Video will appear here automatically when finished.</p>
             </div>
        ) : (
          <div className="w-full h-96 flex items-center justify-center text-gray-400 bg-gray-900">
            <div className="text-center">
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-sm">Video recording unavailable</p>
            </div>
          </div>
        )}
      </div>

      {/* Console Errors Panel - Collapsible */}
      {consoleErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowConsolePanel(!showConsolePanel)}
            className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 flex items-center justify-between"
          >
            <h4 className="font-semibold text-sm text-red-900">
              Console Errors ({consoleErrors.length})
            </h4>
            <span className="text-xs">{showConsolePanel ? '▼' : '▶'}</span>
          </button>
          {showConsolePanel && (
            <div className="p-3 max-h-24 overflow-y-auto">
              <div className="space-y-1">
                {consoleErrors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-800 font-mono">
                    [{err.level.toUpperCase()}] {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Results - Full Width Below */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white hidden">
        {/* Hidden for video mode */}
        {validationReport ? (
          <ValidationResults report={validationReport} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">🧪</div>
            <p className="text-sm">Validation tests will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
