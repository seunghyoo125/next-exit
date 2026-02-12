import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";
import { JDInterpretation, StrategyAssessment } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interpretation, strategyAssessment } = body as {
      interpretation: JDInterpretation;
      strategyAssessment?: StrategyAssessment;
    };

    if (!interpretation) {
      return NextResponse.json(
        { error: "Interpretation is required" },
        { status: 400 }
      );
    }

    // Get bullet counts by role level
    const bullets = await prisma.bullet.findMany({
      where: { category: "experience" },
      select: { roleLevel: true },
    });

    const stats = { manager: 0, sa: 0, partnership: 0 };
    for (const b of bullets) {
      if (b.roleLevel === "manager") stats.manager++;
      else if (b.roleLevel === "sa") stats.sa++;
      else if (b.roleLevel === "partnership") stats.partnership++;
    }

    const presets = [
      { index: 0, label: "7/4/1 (Manager + SA + Partnership)", desc: "7 manager + 4 SA + 1 partnership bullet" },
      { index: 1, label: "7/4 (Manager + SA)", desc: "7 manager + 4 SA bullets" },
      { index: 2, label: "8/4 (Manager + SA)", desc: "8 manager + 4 SA bullets" },
    ];

    const strategyContext = strategyAssessment
      ? `\nStrategy Assessment:
- Readiness: ${strategyAssessment.overallReadiness}
- Strengths: ${strategyAssessment.strengthsToLeverage.join(", ")}
- Gaps: ${strategyAssessment.criticalGaps.join(", ")}
- Plan: ${strategyAssessment.executionPlan.join(" ")}`
      : "";

    const prompt = `You are a resume format advisor. Given the JD interpretation, candidate bullet stats, and available format presets, recommend the best format.

## JD Interpretation
Role Summary: ${interpretation.roleSummary.join(" ")}
Seniority Level: ${interpretation.seniorityLevel}
Core Responsibilities: ${interpretation.coreResponsibilities.join("; ")}
${strategyContext}

## Bullet Bank Stats
- Manager-level bullets: ${stats.manager}
- Senior Associate-level bullets: ${stats.sa}
- Partnership-level bullets: ${stats.partnership}

## Available Presets
${presets.map((p) => `${p.index}: "${p.label}" — ${p.desc}`).join("\n")}

## Instructions
Choose the best preset for this specific role. Consider:
- Does including partnership add value for this role, or is it noise?
- Is 7 or 8 manager bullets better given the role's scope?
- Are there enough bullets at each level to fill the format without padding?

Return a JSON object:
- "recommendedIndex": number (0, 1, or 2)
- "rationale": 2-3 sentences explaining why this format is best for this specific role

Return ONLY valid JSON.`;

    const text = await callAI(prompt, 512, { label: "recommend-format" });
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      recommendedIndex: typeof parsed.recommendedIndex === "number" ? parsed.recommendedIndex : 1,
      rationale: parsed.rationale || "Default recommendation based on bullet bank composition.",
    });
  } catch (error) {
    console.error("Recommend format error:", error);
    return NextResponse.json(
      { error: "Failed to recommend format" },
      { status: 500 }
    );
  }
}
