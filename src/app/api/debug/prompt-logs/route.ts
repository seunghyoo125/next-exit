import { NextRequest, NextResponse } from "next/server";
import { getPromptLog } from "@/lib/ai/client";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const label = req.nextUrl.searchParams.get("label");
  if (!label) {
    return NextResponse.json({ error: "label query param required" }, { status: 400 });
  }

  const log = getPromptLog(label);
  if (!log) {
    return NextResponse.json({ error: "No log found for label" }, { status: 404 });
  }

  return NextResponse.json(log);
}
