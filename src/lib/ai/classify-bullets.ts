import { callAI } from "./client";
import { ParsedBullet, RoleLevel } from "@/types";

export async function classifyBullets(
  bullets: ParsedBullet[],
  existingThemes: string[]
): Promise<ParsedBullet[]> {
  const bulletTexts = bullets
    .map((b, i) => `[${i}] (${b.roleTitle} @ ${b.company}) ${b.content}`)
    .join("\n");

  const themesContext =
    existingThemes.length > 0
      ? `\nExisting themes in the database (ONLY reuse one if the bullet describes the exact same specific accomplishment, just worded differently):\n${existingThemes.map((t) => `- ${t}`).join("\n")}\n`
      : "";

  const prompt = `You are a resume bullet classifier. For each bullet below, assign:

1. roleLevel: one of "manager", "sa", or "partnership" based on the role title:
   - "manager": Manager, Director, VP, Head, Lead, Principal
   - "sa": Associate, Senior Associate, Analyst, Consultant, Senior Consultant, Engineer, Senior Engineer
   - "partnership": Partnership, Product Partner, Volunteer, Intern, or anything that doesn't clearly fit manager/sa

2. theme: a specific accomplishment name (2-4 words) extracted from what the bullet literally describes. Each bullet should get its OWN unique theme — do NOT group different accomplishments under one umbrella/project theme. The theme names the specific thing built or done in that bullet, not the broader project.
   Good examples: "Impact Analysis Workflow", "Triage Intelligence System", "Anomaly Detection Workflows", "Search & Retrieval Foundation"
   Bad examples: "Issue Resolution Platform" (too broad, groups multiple bullets), "Internal AI Tooling" (umbrella project name), "Data Analytics" (too vague)
${themesContext}
ONLY reuse an existing theme when a bullet describes the EXACT SAME specific accomplishment as that theme, just worded differently. Different features/accomplishments within the same project must get different themes.

Bullets:
${bulletTexts}

Return a JSON array where each element has:
- index: the bullet index number
- roleLevel: "manager" | "sa" | "partnership"
- theme: string

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 4096, { label: "classify-bullets" });

  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const classifications: { index: number; roleLevel: RoleLevel; theme: string }[] =
      JSON.parse(jsonStr);

    return bullets.map((bullet, i) => {
      const classification = classifications.find((c) => c.index === i);
      return {
        ...bullet,
        roleLevel: classification?.roleLevel || "",
        theme: classification?.theme || "",
      };
    });
  } catch {
    return bullets;
  }
}
