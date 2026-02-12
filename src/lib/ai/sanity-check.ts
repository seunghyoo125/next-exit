import { callAI, parseAIJSON } from "./client";
import { JDInterpretation, StrategyAssessment, SanityCheckResult } from "@/types";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

const SCHEMA_HINT = `{ overallCoherence: string, narrativeGaps: string[], redundancies: string[], toneConsistency: string, finalVerdict: "ready"|"needs_changes", suggestions: string[] }`;

interface FinalBullet {
  sectionRole: string;
  sectionCompany: string;
  text: string;
}

export async function sanityCheck(
  bullets: FinalBullet[],
  interpretation: JDInterpretation,
  strategyAssessment: StrategyAssessment | null
): Promise<SanityCheckResult> {
  // Group bullets by section
  const sections: Record<string, string[]> = {};
  for (const b of bullets) {
    const key = `${b.sectionRole} @ ${b.sectionCompany}`;
    if (!sections[key]) sections[key] = [];
    sections[key].push(b.text);
  }

  const resumeLayout = Object.entries(sections)
    .map(([section, bullets]) => `${section}\n${bullets.map((b) => `  - ${b}`).join("\n")}`)
    .join("\n\n");

  const strategyContext = strategyAssessment
    ? `\nStrategy Assessment:
- Readiness: ${strategyAssessment.overallReadiness}
- Execution Plan: ${strategyAssessment.executionPlan.join(" ")}`
    : "";

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `You are a senior resume reviewer doing a final quality check before submission. Review the complete resume holistically.

## Target Role
Role Summary: ${interpretation.roleSummary.join(" ")}
Core Responsibilities: ${interpretation.coreResponsibilities.join("; ")}
Real Skills: ${interpretation.realSkills.join(", ")}
Seniority: ${interpretation.seniorityLevel}
Match Guidance: ${interpretation.matchGuidance.join(" ")}
${strategyContext}
${profileBlock}
## Complete Resume
${resumeLayout}

## Review Instructions
Assess the resume as a WHOLE document. Look for:
1. **Overall Coherence**: Does the resume tell a clear story? Does it build a narrative of relevant experience?
2. **Narrative Gaps**: Are there skills or experiences the role needs that aren't demonstrated anywhere?
3. **Redundancy**: Are any bullets saying essentially the same thing?
4. **Tone Consistency**: Is the writing style consistent across sections? Are action verbs varied?
5. **Section Balance**: Are the sections well-proportioned? Does the most relevant section get enough space?

## Output Format
Return a JSON object:
- "overallCoherence": 2-3 sentences assessing how well the resume tells a unified story for this role
- "narrativeGaps": array of strings — things the role needs that aren't shown
- "redundancies": array of strings — pairs/groups of bullets that overlap
- "toneConsistency": 1-2 sentences on writing quality and consistency
- "finalVerdict": "ready" or "needs_changes"
- "suggestions": array of 2-5 specific, actionable suggestions for improvement

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 2048, { label: "sanity-check" });

  try {
    const parsed = await parseAIJSON(text, SCHEMA_HINT, "sanity-check") as Record<string, unknown>;

    const verdict = parsed.finalVerdict === "ready" ? "ready" : "needs_changes";

    return {
      overallCoherence: String(parsed.overallCoherence || ""),
      narrativeGaps: Array.isArray(parsed.narrativeGaps) ? parsed.narrativeGaps : [],
      redundancies: Array.isArray(parsed.redundancies) ? parsed.redundancies : [],
      toneConsistency: String(parsed.toneConsistency || ""),
      finalVerdict: verdict,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return {
      overallCoherence: "Could not generate review",
      narrativeGaps: [],
      redundancies: [],
      toneConsistency: "",
      finalVerdict: "needs_changes",
      suggestions: [],
    };
  }
}
