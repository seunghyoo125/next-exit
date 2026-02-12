import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recommendBullets } from "@/lib/ai/recommend-bullets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription, sections, interpretation } = body;

    if (!jobDescription || !sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: "jobDescription and sections are required" },
        { status: 400 }
      );
    }

    // Fetch experience bullets and projects in parallel
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

    const recommendations = await recommendBullets(
      jobDescription,
      sections,
      bulletsForAI,
      projects,
      interpretation
    );

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
