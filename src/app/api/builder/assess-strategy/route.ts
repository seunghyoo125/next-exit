import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assessStrategy } from "@/lib/ai/assess-strategy";
import { JDInterpretation } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interpretation } = body as { interpretation: JDInterpretation };

    if (!interpretation) {
      return NextResponse.json(
        { error: "Interpretation is required" },
        { status: 400 }
      );
    }

    // Fetch all experience bullets
    const bullets = await prisma.bullet.findMany({
      where: { category: "experience" },
      select: {
        content: true,
        roleLevel: true,
        theme: true,
        company: true,
        roleTitle: true,
      },
    });

    // Fetch all projects
    const projects = await prisma.project.findMany({
      select: {
        name: true,
        description: true,
      },
    });

    const result = await assessStrategy(interpretation, bullets, projects);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Assess strategy error:", error);
    return NextResponse.json(
      { error: "Failed to assess strategy" },
      { status: 500 }
    );
  }
}
