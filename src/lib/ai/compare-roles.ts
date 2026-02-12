import { callAI, parseAIJSON } from "./client";
import { JDInterpretation, SectionRecommendation, RoleComparisonSummary } from "@/types";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

interface RoleData {
  label: string;
  interpretation: JDInterpretation;
  recommendations: SectionRecommendation[];
}

export async function compareRoles(
  roles: RoleData[]
): Promise<RoleComparisonSummary> {
  const rolesBlock = roles
    .map((role) => {
      const topBullets = role.recommendations
        .flatMap((s) => s.recommendations)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const avgScore =
        topBullets.length > 0
          ? Math.round(topBullets.reduce((sum, b) => sum + b.score, 0) / topBullets.length)
          : 0;

      const misleadingBlock = role.interpretation.misleadingSignals.length > 0
        ? `Misleading Signals:\n${role.interpretation.misleadingSignals.map((s) => `- "${s.signal}" → ${s.reality}`).join("\n")}`
        : "Misleading Signals: None identified";

      return `## Role: ${role.label}
Interpretation Summary: ${role.interpretation.roleSummary.join(" ")}
Seniority: ${role.interpretation.seniorityLevel}
Core Responsibilities: ${role.interpretation.coreResponsibilities.join("; ")}
Real Skills: ${role.interpretation.realSkills.join(", ")}
Match Guidance: ${role.interpretation.matchGuidance.join(" ")}
${misleadingBlock}

Top 5 Recommended Bullets (avg score: ${avgScore}):
${topBullets.map((b) => `- [Score: ${b.score}] ${b.content} (${b.reason})`).join("\n")}`;
    })
    .join("\n\n---\n\n");

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `You are an opinionated resume strategist comparing a candidate's fit across ${roles.length} target roles. You have the JD interpretation and top recommended bullets for each role.

Your philosophy: build a top 5% resume by understanding what the role ACTUALLY needs, not what the JD literally says.

${rolesBlock}
${profileBlock}
## Anti-Fluff Rules
- Do NOT do literal keyword matching across roles. A bullet about "leading cross-functional migrations" is relevant to a TPM role even if the JD says "program management" — the functional skill is the same.
- Functional relevance > domain relevance. A healthcare data pipeline is as relevant to a fintech data role as another fintech project — the skill (data engineering) is what matters.
- Use each role's misleadingSignals to avoid traps. If a JD says "passion for AI" but the role is really about vendor management, don't penalize a candidate for lacking ML experience.
- Score based on matchGuidance, not keyword overlap. The interpretation already tells you what actually matters.

## Table-Stakes Filtering
These are table-stakes skills — do NOT include them in matchedSkills or gapAreas, and do NOT factor them into fit assessment:
- Communication skills, written/verbal communication
- Collaboration, teamwork, team player
- Passion for X, enthusiasm for Y
- Attention to detail
- Self-starter, proactive
- Problem-solving (generic)
These embed naturally through experiences. Only include substantive, role-specific skills that actually differentiate candidates.

## Role-Type Awareness
If comparing across role types (e.g., PM vs TPM vs Strategy), recognize that the same bullet needs different framing:
- TPM: emphasize technical execution, cross-functional coordination, system-level thinking, delivery rigor, dependency management
- PM: emphasize product vision, user outcomes, prioritization frameworks, stakeholder influence, metrics-driven decisions
- Strategy/Ops: emphasize analytical frameworks, executive communication, market sizing, business case development
Provide per-role reframingAdvice that specifies tone, ownership language, and emphasis shifts needed.

## Top 5% Targeting
For each role, assess: given the existing bullets and project experience, is there a viable path to a top 5% resume for this role?
- What would it take? Reframing existing bullets? Adding new projects? Different emphasis?
- Be honest — if the gap is too wide, say so. If it's achievable with reframing alone, say that.

## Relative Ranking Focus
- Do NOT treat fitScore as the main signal. Instead, assign fitLevel: "strong" (clear fit, mostly reframing needed), "moderate" (decent fit but real gaps exist), or "stretch" (significant gaps, would need new experience).
- Rankings should emphasize clarity of fit — is the gap between roles obvious or marginal?
- overallRecommendation should state which role has the clearest advantage and why, with career trajectory considerations.

## Execution Plan
For the top-ranked role, provide a concrete execution plan: which bullets to reframe and how, what tone shifts to make, what gaps to address with project experience. This should be actionable enough that the candidate can start immediately.

## Output Format
Return a JSON object with:
- "rankings": array sorted by fitLevel (strong first, then moderate, then stretch), each with:
  - "label": string
  - "fitScore": number (0-100)
  - "fitLevel": "strong" | "moderate" | "stretch"
  - "matchedSkills": string[] (substantive, role-specific only — NO table-stakes)
  - "gapAreas": string[] (substantive, role-specific only — NO table-stakes)
  - "strengthHighlights": string[]
  - "reframingAdvice": string[] (3-5 specific pieces of advice on how to adjust bullet tone/language for this role type)
  - "topFivePercentPath": string (1-3 sentence assessment of viability and what it takes)
- "overallRecommendation": string (2-4 sentences, relative ranking focus, which role has clearest advantage)
- "commonStrengths": string[] (substantive skills strong across ALL roles)
- "universalGaps": string[] (substantive gaps across ALL roles)
- "executionPlan": string (concrete step-by-step plan for the top-ranked role: bullet reframing, tone shifts, gap-filling)

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const SCHEMA_HINT = `{ rankings: [{ label: string, fitScore: number, fitLevel: "strong"|"moderate"|"stretch", matchedSkills: string[], gapAreas: string[], strengthHighlights: string[], reframingAdvice: string[], topFivePercentPath: string }], overallRecommendation: string, commonStrengths: string[], universalGaps: string[], executionPlan: string }`;

  const text = await callAI(prompt, 6144, { label: "compare-roles" });

  try {
    const parsed = await parseAIJSON(text, SCHEMA_HINT, "compare-roles") as Record<string, unknown>;

    const validFitLevels = ["strong", "moderate", "stretch"] as const;
    type FitLevel = typeof validFitLevels[number];
    const parseFitLevel = (val: unknown): FitLevel =>
      typeof val === "string" && validFitLevels.includes(val as FitLevel)
        ? (val as FitLevel)
        : "moderate";

    return {
      rankings: Array.isArray(parsed.rankings)
        ? parsed.rankings.map((r: Record<string, unknown>) => ({
            label: typeof r.label === "string" ? r.label : "",
            fitScore: typeof r.fitScore === "number" ? r.fitScore : 0,
            fitLevel: parseFitLevel(r.fitLevel),
            matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills : [],
            gapAreas: Array.isArray(r.gapAreas) ? r.gapAreas : [],
            strengthHighlights: Array.isArray(r.strengthHighlights) ? r.strengthHighlights : [],
            reframingAdvice: Array.isArray(r.reframingAdvice) ? r.reframingAdvice : [],
            topFivePercentPath: typeof r.topFivePercentPath === "string" ? r.topFivePercentPath : "",
          }))
        : [],
      overallRecommendation: typeof parsed.overallRecommendation === "string" ? parsed.overallRecommendation : "",
      commonStrengths: Array.isArray(parsed.commonStrengths) ? parsed.commonStrengths : [],
      universalGaps: Array.isArray(parsed.universalGaps) ? parsed.universalGaps : [],
      executionPlan: typeof parsed.executionPlan === "string" ? parsed.executionPlan : "",
    };
  } catch {
    return {
      rankings: roles.map((r) => ({
        label: r.label,
        fitScore: 0,
        fitLevel: "moderate" as const,
        matchedSkills: [],
        gapAreas: [],
        strengthHighlights: [],
        reframingAdvice: [],
        topFivePercentPath: "",
      })),
      overallRecommendation: "Failed to generate comparison. Please try again.",
      commonStrengths: [],
      universalGaps: [],
      executionPlan: "",
    };
  }
}
