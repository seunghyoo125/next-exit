import { NextRequest, NextResponse } from "next/server";
import { interpretJD } from "@/lib/ai/interpret-jd";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 }
      );
    }

    const interpretation = await interpretJD(jobDescription);
    return NextResponse.json(interpretation);
  } catch (error) {
    console.error("Interpret JD error:", error);
    return NextResponse.json(
      { error: "Failed to interpret job description" },
      { status: 500 }
    );
  }
}
