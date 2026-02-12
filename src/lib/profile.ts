import { prisma } from "@/lib/db";
import { CandidateProfile, GroundTruthProfile } from "@/types";

function safeParseArray(value: string): string[] {
  try { return JSON.parse(value); } catch { return []; }
}

export type ProfileWithGroundTruth = CandidateProfile & {
  groundTruth: GroundTruthProfile | null;
};

const EMPTY_PROFILE: ProfileWithGroundTruth = {
  background: "",
  proofPoints: [],
  topStrengths: [],
  constraints: [],
  preferredTone: "",
  groundTruth: null,
};

export async function getProfile(): Promise<ProfileWithGroundTruth> {
  const row = await prisma.profile.findUnique({ where: { id: "singleton" } });
  if (!row) return { ...EMPTY_PROFILE };

  let groundTruth: GroundTruthProfile | null = null;
  if (row.groundTruth) {
    try {
      groundTruth = JSON.parse(row.groundTruth) as GroundTruthProfile;
    } catch {
      groundTruth = null;
    }
  }

  return {
    background: row.background,
    proofPoints: safeParseArray(row.proofPoints),
    topStrengths: safeParseArray(row.topStrengths),
    constraints: safeParseArray(row.constraints),
    preferredTone: row.preferredTone,
    groundTruth,
  };
}

export function isProfileEmpty(profile: CandidateProfile): boolean {
  return (
    !profile.background.trim() &&
    profile.proofPoints.length === 0 &&
    profile.topStrengths.length === 0 &&
    profile.constraints.length === 0 &&
    !profile.preferredTone.trim()
  );
}

export function formatProfileForPrompt(profile: ProfileWithGroundTruth): string {
  const gt = profile.groundTruth;

  if (gt && gt.groundTruthSummary) {
    const lines: string[] = [
      "",
      "## Candidate Profile (Ground Truth)",
      "Use this ground-truth profile to calibrate tone, prioritize proof points, and respect constraints.",
      "This reflects the candidate's verified self-description — use it for emphasis and framing, not as license to fabricate.",
      "",
    ];

    if (gt.currentScope) {
      lines.push(`Current Scope: ${gt.currentScope}`);
    }
    if (gt.pastFoundation) {
      lines.push(`Past Foundation: ${gt.pastFoundation}`);
    }
    if (gt.systemsBuilt.length > 0) {
      lines.push(`Systems Built: ${gt.systemsBuilt.join("; ")}`);
    }
    if (gt.operatingModel.length > 0) {
      lines.push(`Operating Model: ${gt.operatingModel.join("; ")}`);
    }
    if (gt.inProgressWork.length > 0) {
      lines.push(`In-Progress Work: ${gt.inProgressWork.join("; ")}`);
    }
    if (gt.nextPlannedSteps.length > 0) {
      lines.push(`Next Planned Steps: ${gt.nextPlannedSteps.join("; ")}`);
    }
    if (gt.proofPoints.length > 0) {
      lines.push(`Proof Points: ${gt.proofPoints.join("; ")}`);
    }
    if (profile.constraints.length > 0) {
      lines.push(`Constraints: ${profile.constraints.join("; ")}`);
    }
    if (profile.preferredTone.trim()) {
      lines.push(`Preferred Tone: ${profile.preferredTone.trim()}`);
    }

    lines.push("");
    return lines.join("\n");
  }

  // Fallback: raw background-based format
  const lines: string[] = [
    "",
    "## Candidate Profile",
    "Use the Candidate Profile to calibrate tone, prioritize proof points in rewrites, and respect constraints. Profile content reflects the candidate's self-view — use it for emphasis and framing, not as license to fabricate claims beyond what bullets actually demonstrate.",
    "",
  ];

  if (profile.background.trim()) {
    lines.push(`Background: ${profile.background.trim()}`);
  }
  if (profile.proofPoints.length > 0) {
    lines.push(`Proof Points: ${profile.proofPoints.join("; ")}`);
  }
  if (profile.topStrengths.length > 0) {
    lines.push(`Top Strengths: ${profile.topStrengths.join("; ")}`);
  }
  if (profile.constraints.length > 0) {
    lines.push(`Constraints: ${profile.constraints.join("; ")}`);
  }
  if (profile.preferredTone.trim()) {
    lines.push(`Preferred Tone: ${profile.preferredTone.trim()}`);
  }

  lines.push("");
  return lines.join("\n");
}
