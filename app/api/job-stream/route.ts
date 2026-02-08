import { NextRequest, NextResponse } from "next/server";
import { testEventBus, TestEvent } from "@/lib/jobs/events";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: "jobId"' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Helper to send event
      const sendEvent = (event: TestEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // 1. Send recent history first (so client catches up)
      const recentEvents = testEventBus.getRecentEvents(jobId);
      recentEvents.forEach(sendEvent);

      // 2. Subscribe to new events
      const unsubscribe = testEventBus.onJobEvent(jobId, (event) => {
        sendEvent(event);
        // If completed or failed, we could close, but maybe let client decide?
        // Let's keep it open in case post-completion events occur
      });

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
