import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Decision = "" | "applied" | "skip";

function parseDecision(value: unknown): Decision | null {
  if (value === "" || value === "applied" || value === "skip") return value;
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const decision = parseDecision(body.userDecision);

  if (decision === null) {
    return NextResponse.json(
      { error: "userDecision must be one of: '', 'applied', 'skip'" },
      { status: 400 }
    );
  }

  const decisionNote = typeof body.decisionNote === "string" ? body.decisionNote.trim() : "";

  try {
    const updated = await prisma.jobAlert.update({
      where: { id },
      data: {
        userDecision: decision,
        decisionNote,
        decidedAt: decision ? new Date() : null,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
}
