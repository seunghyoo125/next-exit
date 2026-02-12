import { NextResponse } from "next/server";
import { analyzeThemes } from "@/lib/ai/analyze-themes";

export async function POST() {
  try {
    const analyses = await analyzeThemes();
    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
