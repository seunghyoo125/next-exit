import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CandidateProfile, GroundTruthProfile } from "@/types";

function safeParseArray(value: string): string[] {
  try { return JSON.parse(value); } catch { return []; }
}

const EMPTY_PROFILE: CandidateProfile = {
  background: "",
  proofPoints: [],
  topStrengths: [],
  constraints: [],
  preferredTone: "",
};

export async function GET() {
  const row = await prisma.profile.findUnique({ where: { id: "singleton" } });
  if (!row) return NextResponse.json({ ...EMPTY_PROFILE, groundTruth: null });

  let groundTruth: GroundTruthProfile | null = null;
  if (row.groundTruth) {
    try {
      groundTruth = JSON.parse(row.groundTruth) as GroundTruthProfile;
    } catch {
      groundTruth = null;
    }
  }

  return NextResponse.json({
    background: row.background,
    proofPoints: safeParseArray(row.proofPoints),
    topStrengths: safeParseArray(row.topStrengths),
    constraints: safeParseArray(row.constraints),
    preferredTone: row.preferredTone,
    groundTruth,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { background, proofPoints, topStrengths, constraints, preferredTone, groundTruth } =
    body as CandidateProfile & { groundTruth?: GroundTruthProfile | null };

  const groundTruthStr = groundTruth ? JSON.stringify(groundTruth) : "";

  await prisma.profile.upsert({
    where: { id: "singleton" },
    create: {
      background: background || "",
      proofPoints: JSON.stringify((proofPoints || []).slice(0, 5)),
      topStrengths: JSON.stringify((topStrengths || []).slice(0, 5)),
      constraints: JSON.stringify((constraints || []).slice(0, 5)),
      preferredTone: preferredTone || "",
      groundTruth: groundTruthStr,
    },
    update: {
      background: background || "",
      proofPoints: JSON.stringify((proofPoints || []).slice(0, 5)),
      topStrengths: JSON.stringify((topStrengths || []).slice(0, 5)),
      constraints: JSON.stringify((constraints || []).slice(0, 5)),
      preferredTone: preferredTone || "",
      groundTruth: groundTruthStr,
    },
  });

  return NextResponse.json({ success: true });
}
