import { NextRequest, NextResponse } from "next/server";
import { refineProfile } from "@/lib/ai/refine-profile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, clarificationAnswers, mode, phase, confirmedSummary } = body;

    if (!profile || !profile.background || typeof profile.background !== "string" || !profile.background.trim()) {
      return NextResponse.json(
        { error: "profile.background is required and must be non-empty" },
        { status: 400 }
      );
    }

    const result = await refineProfile(
      profile,
      clarificationAnswers,
      mode || "default",
      phase || 1,
      confirmedSummary
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Refine profile error:", error);
    return NextResponse.json(
      { error: "Failed to refine profile" },
      { status: 500 }
    );
  }
}
