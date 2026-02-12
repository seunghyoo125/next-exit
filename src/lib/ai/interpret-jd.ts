import { callAI, parseAIJSON } from "./client";
import { JDInterpretation } from "@/types";

const SCHEMA_HINT = `{ roleSummary: string[], coreResponsibilities: string[], realSkills: string[], seniorityLevel: string, misleadingSignals: [{ signal: string, reality: string }], matchGuidance: string[] }`;

export async function interpretJD(rawJD: string): Promise<JDInterpretation> {
  const prompt = `You are a skeptical, experienced hiring manager reviewing a job description. Your job is to interpret what this role ACTUALLY requires — not what the JD literally says.

Job descriptions are imprecise documents, often written by HR or recruiters who don't fully understand the role. Your task is to read between the lines and produce a structured interpretation.

## Anti-Literal-Matching Rules
Apply these rules when interpreting:
1. "Lead" in a title does NOT necessarily mean people management — it could mean project lead, tech lead, or initiative owner with zero direct reports.
2. An industry vertical in the title (e.g., "Fleet Management PM", "Healthcare Analyst") does NOT necessarily mean domain expertise is required — it could be a general role that happens to sit in that vertical. Look at the actual responsibilities to determine if domain knowledge is truly needed.
3. "Senior" in a title does NOT always mean truly senior — many companies inflate titles. Look at the scope of responsibilities to gauge real seniority.
4. The "Requirements" or "Qualifications" section is a WISHLIST, not a hard list. Distinguish between what's actually critical vs. nice-to-have by cross-referencing with the responsibilities section.
5. Buzzwords like "fast-paced", "innovative", "collaborative" are filler — ignore them when identifying real skills.
6. Look at WHAT the person will actually DO day-to-day, not what the company describes about itself.

## Job Description
---
${rawJD}
---

## Output Format
Return a JSON object with these fields:
- "roleSummary": array of 2-3 bullet points summarizing what this role ACTUALLY is (not what the title says). Be specific about the real function.
- "coreResponsibilities": array of 4-6 strings describing what the person will actually DO day-to-day
- "realSkills": array of 5-10 strings listing skills that are genuinely needed (include category prefixes like "Technical: ...", "Stakeholder: ...", "Analytical: ..." where helpful)
- "seniorityLevel": one of "Junior", "Mid", "Senior", "Staff/Principal", "Manager", "Director+" — based on actual scope, not title
- "misleadingSignals": array of 2-4 objects, each with "signal" (something in the JD that could cause wrong matches) and "reality" (what it actually means). These are the most important — identify specific things in THIS JD that would trick a naive keyword matcher.
- "matchGuidance": array of 2-4 bullet points telling a resume bullet recommendation system what experience to prioritize and what to deprioritize for this specific role. Be concrete and actionable.

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 2048, { label: "interpret-jd" });

  try {
    const parsed = await parseAIJSON(text, SCHEMA_HINT, "interpret-jd") as Record<string, unknown>;

    return {
      roleSummary: Array.isArray(parsed.roleSummary) ? parsed.roleSummary : [],
      coreResponsibilities: Array.isArray(parsed.coreResponsibilities) ? parsed.coreResponsibilities : [],
      realSkills: Array.isArray(parsed.realSkills) ? parsed.realSkills : [],
      seniorityLevel: (parsed.seniorityLevel as string) || "Unknown",
      misleadingSignals: Array.isArray(parsed.misleadingSignals) ? parsed.misleadingSignals : [],
      matchGuidance: Array.isArray(parsed.matchGuidance) ? parsed.matchGuidance : [],
    };
  } catch {
    return {
      roleSummary: [],
      coreResponsibilities: [],
      realSkills: [],
      seniorityLevel: "Unknown",
      misleadingSignals: [],
      matchGuidance: [],
    };
  }
}
