import { NextRequest, NextResponse } from "next/server";
import { detectSourceFromUrl } from "@/lib/jobs/detect";

function safeUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const normalized = safeUrl(rawUrl);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const detections = await detectSourceFromUrl(normalized);

  return NextResponse.json({
    detections,
    best: detections[0] || null,
  });
}
