import { callAI } from "./client";
import { ParsedBullet, BulletCategory } from "@/types";

export async function parseResume(rawText: string): Promise<ParsedBullet[]> {
  const prompt = `You are a resume parser. Extract every bullet point from this resume text. For each bullet, identify:
- content: the exact bullet text
- section: the section heading it belongs to (e.g., "Professional Experience", "Product Partnership")
- company: the company name (e.g., "PwC", "Google")
- roleTitle: the job title (e.g., "Senior Associate", "Manager")
- category: classify the section as one of: "experience", "education", or "additional"

Category rules:
- "experience": Professional Experience, Work Experience, Product Partnership, any real job/project work
- "education": Education section, degrees, academic programs
- "additional": Skills, Certifications, Summary, Additional Details, Volunteer, Awards, Languages, Interests, or anything else

Return a JSON array of objects. Each object should have: content, section, company, roleTitle, category.

Important:
- Extract EVERY bullet point, don't skip any
- If a bullet doesn't clearly belong to a specific role, use the nearest role heading
- Preserve the exact wording of each bullet
- For sections like "Product Partnership" or "Additional Experience", still extract company and roleTitle if identifiable

Resume text:
---
${rawText}
---

Return ONLY valid JSON, no markdown code blocks or other text.`;

  const text = await callAI(prompt, 4096, { label: "parse-resume" });

  try {
    // Handle potential markdown code blocks in response
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const bullets: ParsedBullet[] = JSON.parse(jsonStr);
    const validCategories: BulletCategory[] = ["experience", "education", "additional"];
    return bullets.map((b) => ({
      ...b,
      category: validCategories.includes(b.category) ? b.category : "experience",
      roleLevel: "" as const,
      theme: "",
    }));
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }
}
