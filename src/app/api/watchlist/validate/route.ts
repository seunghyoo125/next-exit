import { NextRequest, NextResponse } from "next/server";
import { fetchJobsBySource } from "@/lib/jobs/sources";

type SourceType = "greenhouse" | "lever" | "ashby";

function parseSourceType(value: unknown): SourceType | null {
  return value === "greenhouse" || value === "lever" || value === "ashby" ? value : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sourceType = parseSourceType(body.sourceType);
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";

  if (!sourceType || !sourceId) {
    return NextResponse.json(
      { error: "sourceType and sourceId are required" },
      { status: 400 }
    );
  }

  try {
    const jobs = await fetchJobsBySource(sourceType, sourceId);
    return NextResponse.json({
      valid: true,
      count: jobs.length,
      sampleTitles: jobs.slice(0, 5).map((j) => j.title),
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Validation failed",
      },
      { status: 400 }
    );
  }
}
