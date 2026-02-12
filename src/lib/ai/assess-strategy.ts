import { callAI, parseAIJSON } from "./client";
import { JDInterpretation, StrategyAssessment } from "@/types";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

const SCHEMA_HINT = `{ coreWorkAlignment: string[], topFivePercentViability: string[], strengthsToLeverage: string[], criticalGaps: string[], executionPlan: string[], overallReadiness: "strong"|"moderate"|"stretch", leadWithThemes: string[], deEmphasizeThemes: string[], fluffAndJargon: string[] }`;

interface BulletSummary {
  roleLevel: string;
  theme: string;
  content: string;
  company: string;
  roleTitle: string;
}

interface ProjectSummary {
  name: string;
  description: string;
}

async function validateGaps(
  gaps: string[],
  strengths: string[],
  bullets: BulletSummary[]
): Promise<string[]> {
  if (gaps.length === 0) return [];

  const bulletLines = bullets
    .map((b) => `- (${b.roleTitle} @ ${b.company}) [${b.theme}] ${b.content}`)
    .join("\n");

  const prompt = `You are a strict gap validator for resume strategy assessment.

TASK: For each proposed gap, determine if it is GENUINE or FALSE.

A gap is FALSE (remove it) if:
- ANY bullet demonstrates the UNDERLYING capability — even partially, in a different domain, at a different scale, or using different terminology. Focus on the functional skill, not specific tools or methodologies.
- The gap overlaps functionally with any listed strength (contradiction). Examples:
  • "governance leadership" and "hiring/coaching/managing a team" are BOTH leadership → contradiction
  • "retrieval infrastructure" and "MLOps lifecycle" are BOTH infrastructure engineering → contradiction
  • "end-to-end ownership" and "hands-on product ownership" are BOTH ownership → contradiction

A gap is GENUINE (keep it) only if:
- ZERO bullets demonstrate the underlying capability even partially
- It does NOT contradict any listed strength

## Candidate's Bullets
${bulletLines}

## Proposed Strengths
${strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Proposed Gaps to Validate
${gaps.map((g, i) => `${i + 1}. ${g}`).join("\n")}

For each gap, briefly state your reasoning, then give a verdict: GENUINE or FALSE.
After all verdicts, return a JSON array of ONLY the genuine gaps.

End your response with the JSON array on its own line. Example: ["gap that survived"]
If all gaps are false, return: []`;

  const text = await callAI(prompt, 1024, { label: "validate-gaps" });

  try {
    // Extract the last JSON array from the response
    const match = text.match(/\[(?:[^\[\]]*)\]\s*$/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : gaps;
    }
    return gaps; // Couldn't find array — return original
  } catch {
    return gaps; // Parse failed — return original (don't swallow gaps)
  }
}

const systemPrompt = `You are a brutally honest career strategist who assesses candidate-to-role fit based on functional alignment, not keyword overlap.

## Table-Stakes Filtering
These are table-stakes skills — do NOT list them as critical gaps or factor them into assessment:
- Communication skills, written/verbal communication
- Collaboration, teamwork, team player
- Passion for X, enthusiasm for Y
- Attention to detail, self-starter, proactive
- Problem-solving (generic), time management
Only assess substantive, role-specific capabilities that actually differentiate candidates.

## Anti-Keyword-Matching Rules
1. Do NOT do literal keyword matching. Understand what each bullet DESCRIBES functionally.
2. Functional relevance > domain relevance (healthcare pipeline = fintech pipeline, skill is data engineering).
3. Use misleadingSignals to AVOID false gap identification.
4. Assess based on matchGuidance priorities, not keyword overlap.

## Specificity Trap Warning
JDs often list specific tools, methodologies, or frameworks (e.g., "CI/CD", "feature stores", "Kubernetes").
Do NOT list a gap just because the candidate doesn't mention the SPECIFIC technology.
Ask: does the candidate demonstrate the UNDERLYING capability? Building infrastructure = infrastructure experience,
regardless of whether they call it "MLOps", "platform engineering", or "systems architecture".
The JD's terminology is not the only valid terminology.

## Gap Verification Protocol (MANDATORY)
For each gap you consider listing:
1. State the gap in functional terms (what capability is missing?)
2. Search ALL bullets for ANY that demonstrate this capability — even partially, in a different domain, at a different scale
3. If even ONE bullet demonstrates the capability functionally → NOT a gap, it's a reframing opportunity → move to executionPlan
4. Only if ZERO bullets demonstrate the capability even partially → qualifies as criticalGap
You MUST perform this verification in your analysis scratchpad before producing output.

## Gap Quality Standards
Critical gaps must be: (a) substantive and role-specific, (b) verified absent from the entire
bullet bank, (c) relevant to matchGuidance priorities, (d) truly unbridgeable through reframing.

## Contradiction Detection (MANDATORY)
Before finalizing, cross-check your strengths against your gaps:
- If a capability appears in strengthsToLeverage, it CANNOT appear (even reworded) in criticalGaps
- Overlapping capabilities are ONE thing, not two contradictory assessments. Examples of functional overlap:
  • "End-to-end ownership" overlaps with "leadership" and "managing workstreams"
  • "0-to-1 platform buildout" overlaps with "hands-on ownership" and "technical leadership"
  • "Cross-functional program delivery" overlaps with "stakeholder management" and "project leadership"
If you find a contradiction, remove the gap.

## Functional Equivalence Examples

Example 1 — Leadership:
JD: "experience managing engineering teams"
Bullet: "(Senior PM @ Acme) [Platform Buildout] Led 0-to-1 development of internal platform, coordinating across 3 engineering squads"
WRONG: List "people management" as gap because bullet doesn't say "managed direct reports"
RIGHT: Cross-squad coordination on a complex build IS functional leadership. Not a gap — reframing opportunity.

Example 2 — Hands-on ownership:
JD: "hands-on product ownership"
Bullet: "(Program Manager @ StartupCo) [Migration Program] Drove end-to-end delivery for $2M migration, owning roadmap, stakeholder alignment, and go-live"
WRONG: List "hands-on ownership" as gap because title is "Program Manager" not "Product Owner"
RIGHT: End-to-end ownership of roadmap and delivery IS hands-on ownership. The title is irrelevant — the WORK matches.

Example 3 — Genuine gap:
JD: "experience with cloud infrastructure (AWS/GCP)"
Bullet bank: All bullets are application-layer work. Zero infrastructure mentions across entire bank.
RIGHT: This IS a genuine gap. No bullet demonstrates infrastructure work even partially.

Example 4 — Process leadership vs people management:
JD: "experience managing a team of product managers"
Bullet: "(Lead PM @ BigCorp) [Process Governance] Designed and led cross-org evaluation framework, coordinating 4 product squads through intake, prioritization, and delivery"
WRONG: List "people management" as gap because bullet says "coordinating" not "managing direct reports"
RIGHT: Leading a cross-org framework that coordinates multiple product squads IS functional people/team leadership. The org chart line is irrelevant — the WORK is leadership.

## Fluff & Jargon Identification
Before assessing fit, scan the JD for filler language, corporate jargon, and table-stakes phrases that do NOT inform true fit.
Examples: "passionate about excellence", "strong communicator", "self-starter", "fast-paced environment", "team player", "detail-oriented."
List every such phrase you identify from this specific JD in the fluffAndJargon output. This is not optional — the candidate needs to see what was disregarded to trust the assessment. If the JD is unusually concrete and contains no fluff, return an empty array.`;

export async function assessStrategy(
  interpretation: JDInterpretation,
  bullets: BulletSummary[],
  projects: ProjectSummary[]
): Promise<StrategyAssessment> {
  // Group bullets by roleLevel
  const grouped: Record<string, BulletSummary[]> = {};
  for (const b of bullets) {
    const level = b.roleLevel || "Other";
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(b);
  }

  const levelLabels: Record<string, string> = {
    manager: "Manager / Director Level",
    sa: "Senior Associate / IC Level",
    partnership: "Partnership / Other Level",
  };

  const bulletList = Object.entries(grouped)
    .map(([level, items]) => {
      const label = levelLabels[level] || level;
      const lines = items.map((b) => `  - (${b.roleTitle} @ ${b.company}) [${b.theme}] ${b.content}`).join("\n");
      return `### ${label} (${items.length} bullets)\n${lines}`;
    })
    .join("\n\n");

  const projectList = projects.length > 0
    ? `\nProjects:\n${projects.map((p) => `- ${p.name}: ${p.description}`).join("\n")}`
    : "";

  const misleadingBlock = interpretation.misleadingSignals.length > 0
    ? `\nMisleading Signals (AVOID basing gaps on these):\n${interpretation.misleadingSignals.map((s) => `- Signal: "${s.signal}" -> Reality: ${s.reality}`).join("\n")}`
    : "";

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `## JD Interpretation
Role Summary: ${interpretation.roleSummary.join(" ")}

Core Responsibilities:
${interpretation.coreResponsibilities.map((r) => `- ${r}`).join("\n")}

Real Skills Needed:
${interpretation.realSkills.map((s) => `- ${s}`).join("\n")}

Seniority Level: ${interpretation.seniorityLevel}

Match Guidance: ${interpretation.matchGuidance.join(" ")}
${misleadingBlock}

## Candidate's Bullet Bank
${bulletList}
${projectList}
${profileBlock}
## Assessment Instructions

Use matchGuidance as your PRIMARY lens for evaluating alignment.

Be HONEST. Do not sugarcoat. The candidate wants to know:
1. How well their actual work maps to what this role does day-to-day
2. Whether a top 5% resume is realistically achievable with what they have
3. What they should lean into vs. what gaps they can't cover

Respond in two phases.

### Phase 1: Analysis (wrap in <analysis> tags)
Before producing JSON, you MUST work through:

1. CAPABILITY INVENTORY: For each JD responsibility/skill, which bullets demonstrate it? Cite by (role @ company) and theme. Use functional reasoning, not keywords.

2. GAP VERIFICATION: For each potential gap, list bullets checked and verdict: TRUE GAP (zero functional coverage) or REFRAMEABLE (partial/full coverage exists).

3. CONTRADICTION CHECK: List proposed strengths and proposed gaps side by side. Flag and remove any gap that overlaps functionally with a strength.

### Phase 2: JSON Output (after </analysis>)
After the closing </analysis> tag, return a JSON object with:
- "coreWorkAlignment": array of 2-3 bullet points on how well their actual work maps to this role's day-to-day
- "topFivePercentViability": array of 2-3 bullet points on whether top 5% is achievable and what it would take
- "strengthsToLeverage": array of 3-5 strings ranked from most differentiating to least — specific strengths from their bullets that map well
- "criticalGaps": array of 0-3 strings — gaps that are (a) genuinely absent from the entire bullet bank, (b) substantive and role-specific (NOT table-stakes), (c) relevant to matchGuidance priorities, (d) truly unbridgeable through reframing. If no such gaps exist, return an empty array.
- "executionPlan": array of 3-5 bullet points — concrete strategy for what to emphasize, reframe, and de-emphasize
- "overallReadiness": one of "strong" (clear path to competitive resume), "moderate" (possible with good framing), or "stretch" (significant gaps to address)
- "leadWithThemes": array of exactly 3 strings — the top themes/narratives the resume should lead with (short phrases, e.g. "cross-functional program delivery")
- "deEmphasizeThemes": array of exactly 2 strings — themes the candidate should downplay or omit for this role
- "fluffAndJargon": array of 0-10 strings — exact phrases or close paraphrases from the JD that you identified as filler, table-stakes, or corporate jargon and disregarded for fit assessment. Quote the JD language directly where possible.

Return ONLY valid JSON after </analysis>, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 5120, { system: systemPrompt, label: "assess-strategy" });

  try {
    // Extract JSON after </analysis> tag, or use full text if no scratchpad
    const jsonText = text.includes("</analysis>")
      ? text.substring(text.lastIndexOf("</analysis>") + "</analysis>".length).trim()
      : text;

    const parsed = await parseAIJSON(jsonText, SCHEMA_HINT, "assess-strategy") as Record<string, unknown>;

    const readiness = parsed.overallReadiness;
    const validReadiness = readiness === "strong" || readiness === "moderate" || readiness === "stretch"
      ? readiness
      : "moderate";

    const rawGaps = Array.isArray(parsed.criticalGaps) ? parsed.criticalGaps as string[] : [];
    const rawStrengths = Array.isArray(parsed.strengthsToLeverage) ? parsed.strengthsToLeverage as string[] : [];

    // Second pass: validate gaps against bullets and strengths
    const validatedGaps = await validateGaps(rawGaps, rawStrengths, bullets);

    return {
      coreWorkAlignment: Array.isArray(parsed.coreWorkAlignment) ? parsed.coreWorkAlignment : [],
      topFivePercentViability: Array.isArray(parsed.topFivePercentViability) ? parsed.topFivePercentViability : [],
      strengthsToLeverage: rawStrengths,
      criticalGaps: validatedGaps,
      executionPlan: Array.isArray(parsed.executionPlan) ? parsed.executionPlan : [],
      overallReadiness: validReadiness,
      leadWithThemes: Array.isArray(parsed.leadWithThemes) ? parsed.leadWithThemes : [],
      deEmphasizeThemes: Array.isArray(parsed.deEmphasizeThemes) ? parsed.deEmphasizeThemes : [],
      fluffAndJargon: Array.isArray(parsed.fluffAndJargon) ? parsed.fluffAndJargon : [],
    };
  } catch {
    return {
      coreWorkAlignment: [],
      topFivePercentViability: [],
      strengthsToLeverage: [],
      criticalGaps: [],
      executionPlan: [],
      overallReadiness: "moderate",
      leadWithThemes: [],
      deEmphasizeThemes: [],
      fluffAndJargon: [],
    };
  }
}
