import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bullets: true } },
    },
  });

  const formatted = resumes.map((r) => ({
    id: r.id,
    filename: r.filename,
    fileType: r.fileType,
    targetCompany: r.targetCompany,
    targetRole: r.targetRole,
    bulletCount: r._count.bullets,
    createdAt: r.createdAt,
  }));

  return NextResponse.json(formatted);
}
