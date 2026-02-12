import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const builtResume = await prisma.builtResume.findUnique({
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

  if (!builtResume) {
    return NextResponse.json(
      { error: "Built resume not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(builtResume);
}
