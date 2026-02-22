import { NextRequest, NextResponse } from "next/server";
import { runJobAlertCheck } from "@/lib/jobs/run-check";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In local dev, allow manual testing without secret.
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runJobAlertCheck();
  return NextResponse.json(summary);
}
