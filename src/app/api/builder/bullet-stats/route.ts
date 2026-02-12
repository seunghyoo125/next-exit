import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const groups = await prisma.bullet.groupBy({
      by: ["roleLevel"],
      where: { category: "experience" },
      _count: true,
    });

    const stats: Record<string, number> = {
      manager: 0,
      sa: 0,
      partnership: 0,
    };

    for (const group of groups) {
      const level = group.roleLevel.toLowerCase();
      if (level in stats) {
        stats[level] = group._count;
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Bullet stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bullet stats" },
      { status: 500 }
    );
  }
}
