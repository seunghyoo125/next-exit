import { callAI, parseAIJSON } from "./client";
import { SectionConfig, SectionRecommendation, RecommendedBullet, JDInterpretation } from "@/types";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

const SCHEMA_HINT = `[{ roleTitle: string, company: string, recommendations: [{ bulletId: string, content: string, score: number, reason: string }] }]`;

interface BulletForRecommendation {
  id: string;
  content: string;
  company: string;
  roleTitle: string;
  roleLevel: string;
  theme: string;
}

interface ProjectForRecommendation {
  name: string;
  description: string;
}

export async function recommendBullets(
  jobDescription: string,
  sections: SectionConfig[],
  allBullets: BulletForRecommendation[],
  projects: ProjectForRecommendation[] = [],
  interpretation?: JDInterpretation
): Promise<SectionRecommendation[]> {
  const bulletList = allBullets
    .map(
      (b) =>
        `[${b.id}] (${b.roleTitle} @ ${b.company}) [level: ${b.roleLevel}] [theme: ${b.theme}] ${b.content}`
    )
    .join("\n");

  const sectionList = sections
    .map((s, i) => `Section ${i}: ${s.roleTitle} @ ${s.company} (need ${s.bulletCount} bullets)`)
    .join("\n");

  const projectContext = projects.length > 0
    ? `\nProject Context (reference material about actual projects built):
${projects.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

Use the project context to understand what each bullet actually describes. Reference actual project details when explaining relevance.\n`
    : "";

  // Detect multi-role at same company
  const companyCounts: Record<string, number> = {};
  for (const s of sections) {
    const key = s.company.toLowerCase().trim();
    companyCounts[key] = (companyCounts[key] || 0) + 1;
  }
  const hasMultiRole = Object.values(companyCounts).some((c) => c > 1);

  const multiRoleInstructions = hasMultiRole
    ? `\nMulti-Role Instructions (multiple sections share a company):
- Each section's bullets MUST match that role's level. Check the [level: ...] tag on each bullet. Do NOT swap bullets between levels (e.g., no manager-level bullets in a Senior Associate section).
- Avoid thematic overlap between role sections at the same company — each section should highlight different strengths.
- For each section, include a "formatSuggestion" field: a brief note on whether this section adds value for the target job or could be dropped.\n`
    : "";

  // Build job context block — structured interpretation if available, raw JD otherwise
  let jobContextBlock: string;
  if (interpretation) {
    const misleadingBlock = interpretation.misleadingSignals
      .map((s) => `  - Signal: "${s.signal}" → Reality: ${s.reality}`)
      .join("\n");

    jobContextBlock = `## JD Interpretation (defer to this over raw text)
Role Summary: ${interpretation.roleSummary.join(" ")}

Core Responsibilities:
${interpretation.coreResponsibilities.map((r) => `  - ${r}`).join("\n")}

Real Skills Needed:
${interpretation.realSkills.map((s) => `  - ${s}`).join("\n")}

Seniority Level: ${interpretation.seniorityLevel}

Misleading Signals (AVOID matching on these):
${misleadingBlock}

Match Guidance: ${interpretation.matchGuidance.join(" ")}

## Raw Job Description (reference only — defer to interpretation above)
${jobDescription}`;
  } else {
    jobContextBlock = `Job Description:
---
${jobDescription}
---`;
  }

  const antiKeywordRules = `
## Anti-Keyword-Matching Rules (ALWAYS follow these)
1. Do NOT do literal keyword matching — understand what each bullet DESCRIBES functionally, not just what words it contains.
2. Title words are signals, not matches. "Lead" in the JD does NOT mean you should match bullets about people management — it could mean project ownership.
3. Industry jargon maps to general skills. A bullet about building a healthcare dashboard is equally relevant to a fintech dashboard role — the skill is dashboarding, not the industry.
4. Prioritize FUNCTIONAL relevance over DOMAIN relevance. A bullet demonstrating the right type of work in a different industry beats a bullet from the same industry doing irrelevant work.
5. Use the misleadingSignals (if provided) to actively AVOID matching traps — do not select bullets just because they share surface keywords with misleading JD terms.
6. Score based on matchGuidance (if provided), not keyword overlap. The guidance tells you what experience matters most.`;

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `You are a resume builder assistant. Given a job description analysis and available bullets, recommend the best bullets for each resume section.

${jobContextBlock}
${projectContext}${profileBlock}${antiKeywordRules}

Resume Sections:
${sectionList}

Available Bullets:
${bulletList}
${multiRoleInstructions}
For each section, recommend bullets ranked by relevance to the job description. For each recommendation:
- Pick bullets that match the section's role and company
- Also consider bullets from OTHER roles/companies if they demonstrate relevant skills
- If multiple bullets share the same theme (same accomplishment), only recommend the most relevant to the target job
- Score from 0-100 for relevance
- Give a brief reason for the recommendation that references the FUNCTIONAL match, not surface keywords

Return a JSON array of section recommendations. Each has:
- roleTitle: string
- company: string
- recommendations: array of { bulletId: string, content: string, score: number, reason: string }${hasMultiRole ? "\n- formatSuggestion: string (brief note on whether this section adds value for the target job)" : ""}

Order recommendations by score (highest first). Include more recommendations than the bullet count (2-3x) so the user has choices.

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 6144, { label: "recommend-bullets" });

  try {
    return await parseAIJSON(text, SCHEMA_HINT, "recommend-bullets") as SectionRecommendation[];
  } catch {
    return sections.map((s) => ({
      roleTitle: s.roleTitle,
      company: s.company,
      recommendations: [] as RecommendedBullet[],
    }));
  }
}
