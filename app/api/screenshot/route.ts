import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/screenshot?path=/absolute/path/to/screenshot.png
 * 
 * Serves screenshot files from the test-results directory
 */
export async function GET(request: NextRequest) {
  try {
    // Get path from query params
    const filePath = request.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Screenshot not found" },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Return with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving screenshot:", error);
    return NextResponse.json(
      { error: "Failed to serve screenshot" },
      { status: 500 }
    );
  }
}
