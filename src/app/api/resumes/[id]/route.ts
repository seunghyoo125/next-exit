import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const resume = await prisma.resume.findUnique({
    where: { id },
    include: {
      bullets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: resume.id,
    filename: resume.filename,
    fileType: resume.fileType,
    targetCompany: resume.targetCompany,
    targetRole: resume.targetRole,
    createdAt: resume.createdAt,
    bullets: resume.bullets.map((b) => ({
      id: b.id,
      content: b.content,
      section: b.section,
      company: b.company,
      roleTitle: b.roleTitle,
      category: b.category,
      roleLevel: b.roleLevel,
      theme: b.theme,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, string> = {};
  if (typeof body.targetCompany === "string") data.targetCompany = body.targetCompany;
  if (typeof body.targetRole === "string") data.targetRole = body.targetRole;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const resume = await prisma.resume.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      id: resume.id,
      targetCompany: resume.targetCompany,
      targetRole: resume.targetRole,
    });
  } catch {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Check if any bullets from this resume are used in built resumes
    const usedBullets = await prisma.builtResumeBullet.findMany({
      where: {
        bullet: { resumeId: id },
      },
      include: {
        bullet: { select: { content: true } },
        section: {
          include: {
            builtResume: { select: { title: true } },
          },
        },
      },
    });

    if (usedBullets.length > 0) {
      const builtResumeTitles = [
        ...new Set(usedBullets.map((ub) => ub.section.builtResume.title)),
      ];
      return NextResponse.json(
        {
          error: `Cannot delete this resume because ${usedBullets.length} of its bullets are used in built resumes: ${builtResumeTitles.join(", ")}. Remove those bullets from the built resumes first.`,
        },
        { status: 400 }
      );
    }

    await prisma.resume.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
