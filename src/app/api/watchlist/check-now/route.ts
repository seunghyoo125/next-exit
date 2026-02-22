import { NextResponse } from "next/server";
import { runJobAlertCheck } from "@/lib/jobs/run-check";

export const maxDuration = 60;

export async function POST() {
  try {
    const summary = await runJobAlertCheck();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
