/**
 * WebSocket API Route for Live Test Streaming
 * 
 * Establishes WebSocket connection to stream real-time test events
 * Path: /api/test-stream
 * Query params: jobId - The job ID to stream events for
 */

import { NextRequest } from "next/server";
import { testEventBus } from "@/lib/jobs/events";

// Handler for WebSocket upgrade requests
export function GET(request: NextRequest) {
  // Extract jobId from query parameters
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return new Response("Missing jobId parameter", { status: 400 });
  }

  // Check if the request is trying to upgrade to WebSocket
  const upgradeHeader = request.headers.get("upgrade");

  if (upgradeHeader !== "websocket") {
    // Return test events as Server-Sent Events (SSE) instead
    // This is a fallback that works without native WebSocket support
    return handleSSE(jobId);
  }

  // WebSocket upgrade not directly supported in Next.js Edge Runtime
  // Use SSE as fallback for now
  return handleSSE(jobId);
}

/**
 * Server-Sent Events (SSE) stream implementation
 * Browser-compatible alternative to WebSocket
 */
function handleSSE(jobId: string) {
  const stream = new ReadableStream({
    start(controller) {
      // Send recent events first (late subscriber catch-up)
      const recentEvents = testEventBus.getRecentEvents(jobId);
      for (const event of recentEvents) {
        controller.enqueue(
          `data: ${JSON.stringify(event)}\n\n`
        );
      }

      // Subscribe to new events
      const unsubscribe = testEventBus.onJobEvent(jobId, (event) => {
        controller.enqueue(
          `data: ${JSON.stringify(event)}\n\n`
        );
      });

      // Cleanup on client disconnect
      return () => {
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering for real-time streaming
    },
  });
}
