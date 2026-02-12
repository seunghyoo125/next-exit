import { callAI, parseAIJSON } from "./client";
import { JDInterpretation, StrategyAssessment, BulletReview } from "@/types";
import { evidenceCheck } from "./evidence-check";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

const SCHEMA_HINT = `[{ bulletId: string, originalText: string, verdict: "good"|"tone"|"enhance", feedback: string, suggestedText?: string }]`;

interface BulletForReview {
  bulletId: string;
  content: string;
  sectionRole: string;
  sectionCompany: string;
}

export async function reviewBullets(
  bullets: BulletForReview[],
  interpretation: JDInterpretation,
  strategyAssessment: StrategyAssessment | null,
  userNotes: string
): Promise<BulletReview[]> {
  // Run evidence check pre-pass
  const constraints = await evidenceCheck(bullets, interpretation);
  const constraintMap = new Map(constraints.map((c) => [c.bulletId, c]));

  const bulletList = bullets
    .map((b) => {
      const line = `[${b.bulletId}] (${b.sectionRole} @ ${b.sectionCompany}) ${b.content}`;
      const c = constraintMap.get(b.bulletId);
      if (!c) return line;
      const parts = [line];
      parts.push(`  Allowed claims: ${c.allowedClaims.join(", ")}`);
      parts.push(`  Disallowed claims: ${c.disallowedClaims.join(", ")}`);
      if (c.missingInfoPrompt) {
        parts.push(`  Missing info: "${c.missingInfoPrompt}"`);
      }
      return parts.join("\n");
    })
    .join("\n");

  const strategyContext = strategyAssessment
    ? `\nStrategy Assessment:
- Readiness: ${strategyAssessment.overallReadiness}
- Strengths: ${strategyAssessment.strengthsToLeverage.join(", ")}
- Gaps: ${strategyAssessment.criticalGaps.join(", ")}
- Plan: ${strategyAssessment.executionPlan.join(" ")}`
    : "";

  const notesContext = userNotes
    ? `\nUser Notes: ${userNotes}`
    : "";

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `You are a senior resume editor who gives honest, actionable feedback. Review each bullet for a specific target role.

## Target Role
Role Summary: ${interpretation.roleSummary.join(" ")}
Core Responsibilities: ${interpretation.coreResponsibilities.join("; ")}
Real Skills: ${interpretation.realSkills.join(", ")}
Seniority: ${interpretation.seniorityLevel}
Match Guidance: ${interpretation.matchGuidance.join(" ")}
${strategyContext}${notesContext}
${profileBlock}
## Bullets to Review
${bulletList}

## Review Instructions
For each bullet, provide:
1. **Verdict**:
   - "good" — bullet is well-written and relevant, no changes needed
   - "tone" — content is relevant but tone/framing could be improved for this role
   - "enhance" — bullet needs significant improvement to be effective for this role
2. **Feedback**: 1-2 sentences explaining your verdict. Be specific about WHAT works or doesn't.
3. **Suggested rewrite**: If verdict is "tone" or "enhance", provide a rewritten version that:
   - Maintains the core facts/metrics
   - Reframes to emphasize relevance to the target role
   - Uses stronger action verbs and quantification where possible
   - If verdict is "good", you may omit this or provide a minor polish

## Evidence Constraints
Each bullet has allowed/disallowed claims from a fact-check pass.
- Rewrites MUST stay within the allowedClaims — do not assert anything beyond them.
- Rewrites MUST NOT introduce any disallowedClaims.
- If missingInfoPrompt is present, do NOT guess the answer — rewrite without that info.

Do NOT:
- Change facts or invent metrics
- Add skills the candidate doesn't demonstrate
- Make the bullet generic — keep it specific

## Output Format
Return a JSON array of objects:
- "bulletId": string
- "originalText": string
- "verdict": "good" | "tone" | "enhance"
- "feedback": string
- "suggestedText": string (optional if verdict is "good")

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 4096, { label: "review-bullets" });

  try {
    const parsed = await parseAIJSON(text, SCHEMA_HINT, "review-bullets") as Record<string, unknown>[];

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: Record<string, unknown>) => ({
      bulletId: String(item.bulletId || ""),
      originalText: String(item.originalText || ""),
      verdict: (["good", "tone", "enhance"].includes(item.verdict as string)
        ? item.verdict
        : "tone") as BulletReview["verdict"],
      feedback: String(item.feedback || ""),
      suggestedText: item.suggestedText ? String(item.suggestedText) : undefined,
    }));
  } catch {
    return [];
  }
}
