import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, jobDescription, interpretation } = body;

    const draft = await prisma.builtResume.create({
      data: {
        title: title || "Untitled Draft",
        jobDescription: jobDescription || "",
        status: "draft",
        currentStep: 1,
        interpretation: interpretation ? JSON.stringify(interpretation) : "",
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Create draft error:", error);
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const drafts = await prisma.builtResume.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        currentStep: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(drafts);
  } catch (error) {
    console.error("List drafts error:", error);
    return NextResponse.json(
      { error: "Failed to list drafts" },
      { status: 500 }
    );
  }
}
