import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";

export async function analyzeThemes(): Promise<Record<string, string>> {
  const [bullets, projects] = await Promise.all([
    prisma.bullet.findMany({
      where: { category: "experience" },
      include: {
        resume: {
          select: { targetCompany: true, targetRole: true },
        },
      },
    }),
    prisma.project.findMany(),
  ]);

  // Group by theme
  const byTheme: Record<
    string,
    { content: string; targetCompany: string; targetRole: string }[]
  > = {};
  for (const b of bullets) {
    const theme = b.theme || "Uncategorized";
    if (!byTheme[theme]) byTheme[theme] = [];
    byTheme[theme].push({
      content: b.content,
      targetCompany: b.resume.targetCompany,
      targetRole: b.resume.targetRole,
    });
  }

  const allThemes = Object.entries(byTheme);

  if (allThemes.length === 0) {
    return {};
  }

  // Split into multi-variant (need AI analysis) and single-variant themes
  const multiVariantThemes = allThemes.filter(([, variants]) => variants.length >= 2);
  const singleVariantThemes = allThemes.filter(([, variants]) => variants.length === 1);

  let analyses: Record<string, string> = {};

  // Generate brief notes for single-variant themes
  for (const [theme, variants] of singleVariantThemes) {
    const v = variants[0];
    analyses[theme] = `Single variant, used on ${v.targetRole || "?"} @ ${v.targetCompany || "?"}`;
  }

  // AI analysis for multi-variant themes
  if (multiVariantThemes.length > 0) {
    const themeBlocks = multiVariantThemes
      .map(([theme, variants]) => {
        const variantLines = variants
          .map(
            (v, i) =>
              `  [${i + 1}] (${v.targetRole || "?"} @ ${v.targetCompany || "?"}) "${v.content}"`
          )
          .join("\n");
        return `Theme: "${theme}" (${variants.length} variants)\n${variantLines}`;
      })
      .join("\n\n");

    const projectContext = projects.length > 0
      ? `Project Context (reference material about actual projects built):
${projects.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

Use this to write more accurate theme analyses. Reference actual project details when relevant.

`
      : "";

    const prompt = `You are analyzing resume bullet variants grouped by theme. For each theme below, write a single-sentence summary (max 20 words) noting:
- How many are identical or nearly identical
- If any differ, briefly note how (e.g., "ops-focused", "AI-focused", "more quantitative")
- Which target company/role has the different version, if applicable

Be concise and direct. No fluff. Think of this as a quick diff signal for someone scanning.

${projectContext}${themeBlocks}

Return a JSON object where keys are the exact theme names and values are the one-liner analysis strings.
Return ONLY valid JSON, no markdown code blocks or other text.`;

    const text = await callAI(prompt, 2048, { label: "analyze-themes" });
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const aiAnalyses: Record<string, string> = JSON.parse(jsonStr);
    analyses = { ...analyses, ...aiAnalyses };
  }

  // Persist all analyses to DB
  await Promise.all(
    Object.entries(analyses).map(([theme, summary]) =>
      prisma.themeAnalysis.upsert({
        where: { theme },
        create: { theme, summary },
        update: { summary },
      })
    )
  );

  return analyses;
}
