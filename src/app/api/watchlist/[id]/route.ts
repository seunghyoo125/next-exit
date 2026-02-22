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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.company === "string") data.company = body.company.trim();
  if (body.sourceType !== undefined) {
    const sourceType = parseSourceType(body.sourceType);
    if (!sourceType) {
      return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
    }
    data.sourceType = sourceType;
  }
  if (typeof body.sourceId === "string") data.sourceId = body.sourceId.trim();
  if (body.titleKeywords !== undefined) {
    data.titleKeywords = JSON.stringify(parseStringArray(body.titleKeywords));
  }
  if (body.locationKeywords !== undefined) {
    data.locationKeywords = JSON.stringify(parseStringArray(body.locationKeywords));
  }
  if (typeof body.active === "boolean") data.active = body.active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.jobWatchlist.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.jobWatchlist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }
}
