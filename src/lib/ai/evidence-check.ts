import { callAI, parseAIJSON } from "./client";
import { JDInterpretation, EvidenceConstraint } from "@/types";
import { getProfile, isProfileEmpty, formatProfileForPrompt } from "@/lib/profile";

interface BulletForReview {
  bulletId: string;
  content: string;
  sectionRole: string;
  sectionCompany: string;
}

const SCHEMA_HINT = `[{ bulletId: string, allowedClaims: string[], disallowedClaims: string[], missingInfoPrompt?: string }]`;

export async function evidenceCheck(
  bullets: BulletForReview[],
  interpretation: JDInterpretation
): Promise<EvidenceConstraint[]> {
  const bulletList = bullets
    .map((b) => `[${b.bulletId}] (${b.sectionRole} @ ${b.sectionCompany}) ${b.content}`)
    .join("\n");

  const systemPrompt = `You are a fact-checker reviewing resume bullets. Your job is to determine what each bullet actually demonstrates based ONLY on the text provided, and what adjacent claims would be fabrication unless explicitly present.

Be strict: if a bullet says "managed a project", it demonstrates project management but does NOT demonstrate people management, budget ownership, or vendor management unless those are explicitly stated.`;

  const profile = await getProfile();
  const profileBlock = isProfileEmpty(profile) ? "" : formatProfileForPrompt(profile);

  const prompt = `## Target Role Context
Role Summary: ${interpretation.roleSummary.join(" ")}
Real Skills Needed: ${interpretation.realSkills.join(", ")}
${profileBlock}
## Bullets to Fact-Check
${bulletList}

## Instructions
For each bullet, extract:
1. **allowedClaims** (2-4 short phrases): What the bullet text actually demonstrates. These are claims a rewrite may assert.
2. **disallowedClaims** (1-3 short phrases): Adjacent claims that would be tempting to add for this target role but are NOT supported by the bullet text. Think about: scope expansion, customer types, vendor management, tools, team size, budget, metrics not mentioned.
3. **missingInfoPrompt** (optional, 1 question): If a strong rewrite for this role would need a fact not present in the bullet, ask one question. Omit if the bullet is self-contained.

Keep responses as short phrases, not full sentences.

## Output Format
Return a JSON array of objects:
- "bulletId": string
- "allowedClaims": array of 2-4 strings
- "disallowedClaims": array of 1-3 strings
- "missingInfoPrompt": string (optional)

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 4096, { system: systemPrompt, label: "evidence-check" });

  try {
    const parsed = await parseAIJSON(text, SCHEMA_HINT, "evidence-check") as Record<string, unknown>[];

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      bulletId: String(item.bulletId || ""),
      allowedClaims: Array.isArray(item.allowedClaims) ? item.allowedClaims.map(String) : [],
      disallowedClaims: Array.isArray(item.disallowedClaims) ? item.disallowedClaims.map(String) : [],
      missingInfoPrompt: item.missingInfoPrompt ? String(item.missingInfoPrompt) : undefined,
    }));
  } catch {
    return [];
  }
}
