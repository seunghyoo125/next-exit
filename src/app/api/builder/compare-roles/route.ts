import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { interpretJD } from "@/lib/ai/interpret-jd";
import { recommendBullets } from "@/lib/ai/recommend-bullets";
import { compareRoles } from "@/lib/ai/compare-roles";
import { JDInterpretation, SectionConfig, SectionRecommendation } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roles, sections } = body;

    if (
      !roles ||
      !Array.isArray(roles) ||
      roles.length < 2 ||
      roles.length > 3
    ) {
      return NextResponse.json(
        { error: "2-3 roles are required" },
        { status: 400 }
      );
    }

    for (const role of roles) {
      if (!role.label?.trim() || !role.jobDescription?.trim()) {
        return NextResponse.json(
          { error: "Each role must have a label and jobDescription" },
          { status: 400 }
        );
      }
    }

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: "sections array is required" },
        { status: 400 }
      );
    }

    // Fetch bullets and projects once
    const [allBullets, projects] = await Promise.all([
      prisma.bullet.findMany({
        where: { category: "experience" },
      }),
      prisma.project.findMany({
        select: { name: true, description: true },
      }),
    ]);

    const bulletsForAI = allBullets.map((b) => ({
      id: b.id,
      content: b.content,
      company: b.company,
      roleTitle: b.roleTitle,
      roleLevel: b.roleLevel,
      theme: b.theme,
    }));

    // Interpret JDs in parallel (skip if client passed interpretation)
    const interpretations: Record<string, JDInterpretation> = {};
    const interpretPromises = roles.map(
      async (role: { label: string; jobDescription: string; interpretation?: JDInterpretation }) => {
        if (role.interpretation) {
          interpretations[role.label] = role.interpretation;
        } else {
          interpretations[role.label] = await interpretJD(role.jobDescription);
        }
      }
    );
    await Promise.all(interpretPromises);

    // Recommend bullets in parallel for each role
    const roleResults: Record<string, SectionRecommendation[]> = {};
    const recommendPromises = roles.map(
      async (role: { label: string; jobDescription: string }) => {
        const recs = await recommendBullets(
          role.jobDescription,
          sections as SectionConfig[],
          bulletsForAI,
          projects,
          interpretations[role.label]
        );
        roleResults[role.label] = recs;
      }
    );
    await Promise.all(recommendPromises);

    // Compare roles
    const rolesData = roles.map((role: { label: string }) => ({
      label: role.label,
      interpretation: interpretations[role.label],
      recommendations: roleResults[role.label],
    }));

    const summary = await compareRoles(rolesData);

    return NextResponse.json({
      roleResults,
      interpretations,
      summary,
    });
  } catch (error) {
    console.error("Compare roles error:", error);
    return NextResponse.json(
      { error: "Failed to compare roles" },
      { status: 500 }
    );
  }
}
