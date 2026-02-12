import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const draft = await prisma.builtResume.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            bullets: {
              orderBy: { sortOrder: "asc" },
              include: {
                bullet: true,
              },
            },
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Get draft error:", error);
    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      title,
      jobDescription,
      currentStep,
      interpretation,
      strategyAssessment,
      userNotes,
      formatPreset,
      sanityCheck,
      status,
    } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (jobDescription !== undefined) data.jobDescription = jobDescription;
    if (currentStep !== undefined) data.currentStep = currentStep;
    if (interpretation !== undefined)
      data.interpretation = typeof interpretation === "string" ? interpretation : JSON.stringify(interpretation);
    if (strategyAssessment !== undefined)
      data.strategyAssessment = typeof strategyAssessment === "string" ? strategyAssessment : JSON.stringify(strategyAssessment);
    if (userNotes !== undefined) data.userNotes = userNotes;
    if (formatPreset !== undefined) data.formatPreset = formatPreset;
    if (sanityCheck !== undefined)
      data.sanityCheck = typeof sanityCheck === "string" ? sanityCheck : JSON.stringify(sanityCheck);
    if (status !== undefined) data.status = status;

    const draft = await prisma.builtResume.update({
      where: { id },
      data,
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Update draft error:", error);
    return NextResponse.json(
      { error: "Failed to update draft" },
      { status: 500 }
    );
  }
}
