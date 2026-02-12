import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyBullets } from "@/lib/ai/classify-bullets";
import { ParsedBullet } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    // Find experience bullets to reclassify
    const toReclassify = await prisma.bullet.findMany({
      where: force
        ? { category: "experience" }
        : {
            category: "experience",
            OR: [{ roleLevel: "" }, { theme: "" }],
          },
    });

    if (toReclassify.length === 0) {
      return NextResponse.json({ message: "No bullets to reclassify", updated: 0 });
    }

    // When force-reclassifying all, don't pass existing themes (start fresh)
    const existingThemes: string[] = force
      ? []
      : (await prisma.bullet.findMany({
          where: { category: "experience", theme: { not: "" } },
          distinct: ["theme"],
          select: { theme: true },
        })).map((r) => r.theme);

    // Convert to ParsedBullet format for the classifier
    const parsedBullets: ParsedBullet[] = toReclassify.map((b) => ({
      content: b.content,
      section: b.section,
      company: b.company,
      roleTitle: b.roleTitle,
      category: b.category as ParsedBullet["category"],
      roleLevel: "" as const,
      theme: "",
    }));

    const classified = await classifyBullets(parsedBullets, existingThemes);

    // Update each bullet in DB
    let updated = 0;
    for (let i = 0; i < toReclassify.length; i++) {
      const bullet = toReclassify[i];
      const result = classified[i];
      if (result.roleLevel || result.theme) {
        await prisma.bullet.update({
          where: { id: bullet.id },
          data: {
            roleLevel: result.roleLevel || bullet.roleLevel,
            theme: result.theme || bullet.theme,
          },
        });
        updated++;
      }
    }

    return NextResponse.json({
      message: `Reclassified ${updated} of ${toReclassify.length} bullets`,
      updated,
      total: toReclassify.length,
    });
  } catch (error) {
    console.error("Reclassify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reclassification failed" },
      { status: 500 }
    );
  }
}
