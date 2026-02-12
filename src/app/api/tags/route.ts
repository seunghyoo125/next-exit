import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [roleLevelRecords, themeRecords, companyRecords] = await Promise.all([
    prisma.bullet.findMany({
      where: { category: "experience", roleLevel: { not: "" } },
      distinct: ["roleLevel"],
      select: { roleLevel: true },
    }),
    prisma.bullet.findMany({
      where: { category: "experience", theme: { not: "" } },
      distinct: ["theme"],
      select: { theme: true },
    }),
    prisma.resume.findMany({
      where: { targetCompany: { not: "" } },
      distinct: ["targetCompany"],
      select: { targetCompany: true },
    }),
  ]);

  return NextResponse.json({
    roleLevels: roleLevelRecords.map((r) => r.roleLevel).sort(),
    themes: themeRecords.map((t) => t.theme).sort(),
    companies: companyRecords.map((c) => c.targetCompany).sort(),
  });
}
