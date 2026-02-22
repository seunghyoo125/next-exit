import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type SourceType = "greenhouse" | "lever" | "ashby";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseSourceType(value: unknown): SourceType | null {
  return value === "greenhouse" || value === "lever" || value === "ashby" ? value : null;
}

function parseStoredArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const watches = await prisma.jobWatchlist.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    watches.map((w) => ({
      id: w.id,
      company: w.company,
      sourceType: w.sourceType,
      sourceId: w.sourceId,
      titleKeywords: parseStoredArray(w.titleKeywords),
      locationKeywords: parseStoredArray(w.locationKeywords),
      active: w.active,
      lastCheckedAt: w.lastCheckedAt,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const sourceType = parseSourceType(body.sourceType);
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
  const titleKeywords = parseStringArray(body.titleKeywords);
  const locationKeywords = parseStringArray(body.locationKeywords);

  if (!company || !sourceType || !sourceId) {
    return NextResponse.json(
      { error: "company, sourceType, and sourceId are required" },
      { status: 400 }
    );
  }

  const created = await prisma.jobWatchlist.create({
    data: {
      company,
      sourceType,
      sourceId,
      titleKeywords: JSON.stringify(titleKeywords),
      locationKeywords: JSON.stringify(locationKeywords),
      active: body.active !== false,
    },
  });

  return NextResponse.json({
    id: created.id,
    company: created.company,
    sourceType: created.sourceType,
    sourceId: created.sourceId,
    titleKeywords,
    locationKeywords,
    active: created.active,
    lastCheckedAt: created.lastCheckedAt,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}
