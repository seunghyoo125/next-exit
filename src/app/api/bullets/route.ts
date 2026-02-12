import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roleLevel = searchParams.get("roleLevel");
  const theme = searchParams.get("theme");
  const company = searchParams.get("company");
  const q = searchParams.get("q");
  const resumeId = searchParams.get("resumeId");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};

  // Default to experience only; "all" removes the filter
  if (category && category !== "all") {
    where.category = category;
  } else if (!category) {
    where.category = "experience";
  }

  if (roleLevel) {
    where.roleLevel = roleLevel;
  }
  if (theme) {
    where.theme = theme;
  }
  if (company) {
    where.resume = { targetCompany: company };
  }
  if (q) {
    where.content = { contains: q };
  }
  if (resumeId) {
    where.resumeId = resumeId;
  }

  const bullets = await prisma.bullet.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      resume: {
        select: { targetCompany: true, targetRole: true },
      },
    },
  });

  const formatted = bullets.map((b) => ({
    id: b.id,
    content: b.content,
    section: b.section,
    company: b.company,
    roleTitle: b.roleTitle,
    category: b.category,
    roleLevel: b.roleLevel,
    theme: b.theme,
    resumeId: b.resumeId,
    targetCompany: b.resume.targetCompany,
    targetRole: b.resume.targetRole,
    createdAt: b.createdAt,
  }));

  // Fetch stored theme analyses
  const themeAnalysisRecords = await prisma.themeAnalysis.findMany();
  const themeAnalyses: Record<string, string> = {};
  for (const record of themeAnalysisRecords) {
    themeAnalyses[record.theme] = record.summary;
  }

  return NextResponse.json({ bullets: formatted, themeAnalyses });
}
